import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = process.cwd()
const srcRoot = path.join(root, 'src')
const appRoot = path.join(srcRoot, 'app')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const sourceFiles = walk(srcRoot).filter((file) => /\.[cm]?[jt]sx?$/.test(file))
const schemaAuthority = JSON.parse(fs.readFileSync(path.join(root, '.route', 'schema-constraints.json'), 'utf8'))
const allowedValues = new Map()
for (const [table, constraints] of Object.entries(schemaAuthority.check_constraints)) {
  const columns = new Map()
  for (const constraint of constraints) {
    const match = constraint.match(/^(\w+) IN \((.+)\)$/)
    if (match) columns.set(match[1], new Set([...match[2].matchAll(/'([^']+)'/g)].map((item) => item[1])))
  }
  allowedValues.set(table, columns)
}

function routePath(file, leaf) {
  const rel = path.relative(appRoot, path.dirname(file)).split(path.sep)
    .filter((segment) => !/^\(.+\)$/.test(segment))
  if (path.basename(file) !== leaf) throw new Error(`Unexpected route leaf: ${file}`)
  return `/${rel.join('/')}`.replace(/\/$/, '') || '/'
}

function routeRegex(route) {
  const escaped = route.split('/').map((segment) => {
    if (/^\[\.\.\..+\]$/.test(segment)) return '.+'
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) return '.*'
    if (/^\[.+\]$/.test(segment)) return '[^/]+'
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }).join('/')
  return new RegExp(`^${escaped}/?$`)
}

const pages = walk(appRoot).filter((file) => path.basename(file) === 'page.tsx')
  .map((file) => routePath(file, 'page.tsx'))
const pageMatchers = pages.map((route) => ({ route, regex: routeRegex(route) }))

const apiRoutes = new Map()
for (const file of walk(path.join(appRoot, 'api')).filter((candidate) => path.basename(candidate) === 'route.ts')) {
  const route = routePath(file, 'route.ts')
  const source = fs.readFileSync(file, 'utf8')
  const methods = new Set()
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
    if (new RegExp(`\\bexport\\s+(?:async\\s+function|const)\\s+${method}\\b`).test(source)
      || new RegExp(`\\bexport\\s*\\{[^}]*\\bas\\s+${method}\\b`).test(source)) {
      methods.add(method)
    }
  }
  const responseKeys = new Set()
  let hasDynamicResponse = false
  const routeSource = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  function collectResponseKeys(node) {
    if (ts.isCallExpression(node)
      && ['NextResponse.json', 'Response.json'].includes(node.expression.getText(routeSource))) {
      const body = node.arguments[0]
      if (body && ts.isObjectLiteralExpression(body)) {
        for (const property of body.properties) {
          if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
            responseKeys.add(property.name.getText(routeSource).replace(/["']/g, ''))
          } else if (ts.isSpreadAssignment(property)) {
            hasDynamicResponse = true
          }
        }
      } else {
        hasDynamicResponse = true
      }
    }
    ts.forEachChild(node, collectResponseKeys)
  }
  collectResponseKeys(routeSource)
  apiRoutes.set(route, { file, methods, regex: routeRegex(route), responseKeys, hasDynamicResponse })
}

function literalTarget(node) {
  if (!node) return null
  if (ts.isStringLiteralLike(node)) return node.text
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text
    for (const span of node.templateSpans) value += '${}' + span.literal.text
    return value
  }
  return null
}

function targetCandidate(target) {
  return (target.split(/[?#]/, 1)[0] || '/').replaceAll('${}', '__dynamic__')
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

const nav = []
const fetches = []
const schemaViolations = []
let dbWrites = 0
let constrainedLiteralWrites = 0

function responseKeysRead(fetchNode, sourceFile) {
  const keys = new Set()
  let scope = fetchNode
  while (scope.parent && !ts.isFunctionLike(scope) && !ts.isSourceFile(scope)) scope = scope.parent

  function addPropertyReads(node, identifier) {
    if (ts.isPropertyAccessExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === identifier) {
      keys.add(node.name.text)
    }
    ts.forEachChild(node, (child) => addPropertyReads(child, identifier))
  }

  let current = fetchNode
  let responseVariable = null
  while (current.parent && current !== scope) {
    if (ts.isVariableDeclaration(current.parent) && ts.isIdentifier(current.parent.name)) {
      responseVariable = current.parent.name.text
      break
    }
    current = current.parent
  }

  if (responseVariable) {
    function findJsonVariables(node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
        && node.initializer.getText(sourceFile).includes(`${responseVariable}.json()`)) {
        addPropertyReads(scope, node.name.text)
      }
      ts.forEachChild(node, findJsonVariables)
    }
    findJsonVariables(scope)
  }

  current = fetchNode.parent
  while (current && current !== scope) {
    if (ts.isCallExpression(current)) {
      for (const argument of current.arguments) {
        if ((ts.isArrowFunction(argument) || ts.isFunctionExpression(argument))
          && argument.parameters.length === 1 && ts.isIdentifier(argument.parameters[0].name)) {
          addPropertyReads(argument.body, argument.parameters[0].name.text)
        }
      }
    }
    current = current.parent
  }

  for (const transportKey of ['json', 'ok', 'status', 'statusText', 'headers']) keys.delete(transportKey)
  return [...keys]
}

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const rel = path.relative(root, file).split(path.sep).join('/')

  function recordNav(node, kind, targetNode) {
    const target = literalTarget(targetNode)
    if (target?.startsWith('/')) nav.push({ file: rel, line: lineOf(sourceFile, node), kind, target })
  }

  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.text === 'href' && node.initializer) {
      if (ts.isStringLiteral(node.initializer)) recordNav(node, 'href', node.initializer)
      else if (ts.isJsxExpression(node.initializer)) recordNav(node, 'href', node.initializer.expression)
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sourceFile)
      if (callee === 'router.push' || callee === 'router.replace' || callee === 'redirect') {
        recordNav(node, callee, node.arguments[0])
      }
      if (callee === 'fetch') {
        const target = literalTarget(node.arguments[0])
        if (target?.startsWith('/api/')) {
          let method = 'GET'
          const options = node.arguments[1]
          if (options && ts.isObjectLiteralExpression(options)) {
            const methodProperty = options.properties.find((property) =>
              ts.isPropertyAssignment(property) && property.name.getText(sourceFile).replace(/["']/g, '') === 'method')
            if (methodProperty && ts.isPropertyAssignment(methodProperty)) {
              method = literalTarget(methodProperty.initializer)?.toUpperCase() ?? 'DYNAMIC'
            }
          }
          fetches.push({
            file: rel,
            line: lineOf(sourceFile, node),
            target,
            method,
            responseKeys: responseKeysRead(node, sourceFile),
          })
        }
      }

      if (ts.isPropertyAccessExpression(node.expression)
        && ['insert', 'update', 'upsert'].includes(node.expression.name.text)) {
        function findTable(candidate) {
          if (!candidate) return null
          if (ts.isParenthesizedExpression(candidate) || ts.isAsExpression(candidate)) return findTable(candidate.expression)
          if (ts.isCallExpression(candidate)) {
            if (ts.isPropertyAccessExpression(candidate.expression)
              && candidate.expression.name.text === 'from') return literalTarget(candidate.arguments[0])
            return findTable(candidate.expression)
          }
          if (ts.isPropertyAccessExpression(candidate)) return findTable(candidate.expression)
          return null
        }

        const table = findTable(node.expression.expression)
        if (table) {
          dbWrites += 1
          const payloads = ts.isArrayLiteralExpression(node.arguments[0])
            ? node.arguments[0].elements
            : [node.arguments[0]]
          for (const payload of payloads) {
            if (!payload || !ts.isObjectLiteralExpression(payload)) continue
            for (const property of payload.properties) {
              if (!ts.isPropertyAssignment(property)) continue
              const column = property.name.getText(sourceFile).replace(/["']/g, '')
              const allowed = allowedValues.get(table)?.get(column)
              const value = literalTarget(property.initializer)
              if (allowed && value !== null) {
                constrainedLiteralWrites += 1
                if (!allowed.has(value)) {
                  schemaViolations.push({ file: rel, line: lineOf(sourceFile, property), table, column, value })
                }
              }
            }
          }
        }
      }
    }

    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = node.left.getText(sourceFile)
      if (left === 'window.location' || left === 'window.location.href') {
        recordNav(node, left, node.right)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
}

const deadNav = nav.filter(({ target }) => {
  if (target.startsWith('/api/')) return false
  const candidate = targetCandidate(target)
  return !pageMatchers.some(({ regex }) => regex.test(candidate))
})

const deadFetches = []
const responseKeyMismatches = []
let responseKeyReads = 0
for (const entry of fetches) {
  const candidate = targetCandidate(entry.target)
  let match = [...apiRoutes.entries()].find(([, info]) => info.regex.test(candidate))
  if (!match && entry.target.endsWith('${}')) {
    const staticCandidate = targetCandidate(entry.target.slice(0, -3))
    match = [...apiRoutes.entries()].find(([, info]) => info.regex.test(staticCandidate))
  }
  if (!match) {
    deadFetches.push({ ...entry, issue: 'missing route' })
  } else if (entry.method !== 'DYNAMIC' && !match[1].methods.has(entry.method)) {
    deadFetches.push({ ...entry, issue: `${match[0]} exports ${[...match[1].methods].sort().join(',') || 'no methods'}` })
  }
  if (match) {
    responseKeyReads += entry.responseKeys.length
    for (const key of entry.responseKeys) {
      if (!match[1].hasDynamicResponse && !match[1].responseKeys.has(key)) {
        responseKeyMismatches.push({ ...entry, route: match[0], key, available: [...match[1].responseKeys] })
      }
    }
  }
}

console.log(`PAGE_ROUTES=${pages.length}`)
console.log(`NAV_TARGETS=${nav.length}`)
console.log(`DEAD_NAV_TARGETS=${deadNav.length}`)
for (const entry of deadNav) console.log(`NAV ${entry.file}:${entry.line} ${entry.kind} ${entry.target}`)
console.log(`API_ROUTES=${apiRoutes.size}`)
console.log(`CLIENT_FETCHES=${fetches.length}`)
console.log(`DEAD_FETCH_TARGETS=${deadFetches.length}`)
for (const entry of deadFetches) console.log(`FETCH ${entry.file}:${entry.line} ${entry.method} ${entry.target} (${entry.issue})`)
console.log(`RESPONSE_KEY_READS=${responseKeyReads}`)
console.log(`RESPONSE_KEY_MISMATCHES=${responseKeyMismatches.length}`)
for (const entry of responseKeyMismatches) {
  console.log(`RESPONSE ${entry.file}:${entry.line} ${entry.target} reads ${entry.key}; ${entry.route} returns ${entry.available.join(',')}`)
}
console.log(`DB_WRITES=${dbWrites}`)
console.log(`CONSTRAINED_LITERAL_WRITES=${constrainedLiteralWrites}`)
console.log(`SCHEMA_LITERAL_VIOLATIONS=${schemaViolations.length}`)
for (const entry of schemaViolations) {
  console.log(`SCHEMA ${entry.file}:${entry.line} ${entry.table}.${entry.column}=${entry.value}`)
}

process.exitCode = deadNav.length || deadFetches.length || responseKeyMismatches.length || schemaViolations.length ? 1 : 0
