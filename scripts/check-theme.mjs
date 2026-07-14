import { readFile, readdir } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

const root = process.cwd()
const sourceRoots = ['src/app', 'src/components']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css'])
const globalsPath = 'src/app/globals.css'
const palettePattern = /(?:^|[^a-zA-Z0-9_-])((?:[a-z0-9-]+:)*(?:bg|text|border|ring|outline|divide|from|via|to|fill|stroke|shadow|placeholder)-(?:gray|zinc|slate|neutral|stone|red|green|emerald|blue|amber|purple)(?:-\d{2,3})?(?:\/\d+)?|(?:[a-z0-9-]+:)*(?:bg|text|border|ring|outline|divide|from|via|to|fill|stroke|shadow)-(?:black|white)(?:\/\d+)?)/gi
const hexPattern = /(?<!&)#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})(?![\da-f])/gi

function normalize(path) {
  return path.split(sep).join('/')
}

async function walk(directory) {
  const entries = await readdir(resolve(root, directory), { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return walk(path)
    return extensions.has(extname(entry.name)) ? [normalize(path)] : []
  }))
  return nested.flat()
}

async function loadExemptions() {
  const source = await readFile(resolve(root, '.route/theme-exemptions.txt'), 'utf8')
  const exemptions = new Map()
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const [path, justification] = line.split('|').map(part => part.trim())
    if (!path || !justification) throw new Error(`Malformed theme exemption: ${rawLine}`)
    exemptions.set(normalize(path), justification)
  }
  return exemptions
}

function lineAt(source, index) {
  return source.slice(0, index).split('\n').length
}

function parseTheme(css, id) {
  const block = css.match(new RegExp(`\\[data-theme=["']${id}["']\\]\\s*\\{([\\s\\S]*?)\\}`))
  if (!block) throw new Error(`Missing CSS block for ${id}`)
  return Object.fromEntries([...block[1].matchAll(/--([a-z0-9-]+):\s*(#[\da-f]{6})\s*;/gi)].map(match => [match[1], match[2]]))
}

function luminance(hex) {
  const channels = [1, 3, 5].map(start => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

const exemptions = await loadExemptions()
const files = (await Promise.all(sourceRoots.map(walk))).flat()
const findings = []

for (const path of files) {
  const source = await readFile(resolve(root, path), 'utf8')
  for (const match of source.matchAll(palettePattern)) {
    findings.push(`${path}:${lineAt(source, match.index ?? 0)} palette utility ${match[1]}`)
  }
  if (!exemptions.has(path)) {
    for (const match of source.matchAll(hexPattern)) {
      const line = source.slice(source.lastIndexOf('\n', match.index) + 1, source.indexOf('\n', match.index)).trim()
      const isTokenDefinition = path === globalsPath && line.startsWith('--')
      if (!isTokenDefinition) findings.push(`${path}:${lineAt(source, match.index ?? 0)} hex literal ${match[0]}`)
    }
  }
}

for (const path of exemptions.keys()) {
  try {
    await readFile(resolve(root, path), 'utf8')
  } catch {
    findings.push(`Stale exemption references missing file: ${path}`)
  }
}

const css = await readFile(resolve(root, globalsPath), 'utf8')
const contrastPairs = [
  ['text-primary', 'bg'], ['text-primary', 'surface'], ['text-primary', 'surface-raised'], ['text-primary', 'surface-overlay'],
  ['text-secondary', 'bg'], ['text-secondary', 'surface'], ['text-secondary', 'surface-raised'], ['text-secondary', 'surface-overlay'],
  ['text-muted', 'bg'], ['text-muted', 'surface'], ['text-muted', 'surface-raised'], ['text-muted', 'surface-overlay'],
  ['text-inverse', 'success'], ['text-inverse', 'warning'], ['text-inverse', 'danger'], ['text-inverse', 'info'],
  ['accent-fg', 'accent'], ['success', 'success-soft'],
  ['warning', 'warning-soft'], ['danger', 'danger-soft'], ['info', 'info-soft'],
]

console.log('Theme contrast ratios (WCAG AA normal text >= 4.50):')
for (const id of ['oasis-dark', 'oasis-light', 'oasis-contrast']) {
  const tokens = parseTheme(css, id)
  const results = contrastPairs.map(([foreground, background]) => {
    const ratio = contrast(tokens[foreground], tokens[background])
    if (ratio < 4.5) findings.push(`${id}: --${foreground} / --${background} contrast ${ratio.toFixed(2)} < 4.50`)
    return `${foreground}/${background}=${ratio.toFixed(2)}`
  })
  console.log(`  ${id}: ${results.join(', ')}`)
}

if (findings.length) {
  console.error(`\nTheme gate failed with ${findings.length} finding(s):`)
  findings.forEach(finding => console.error(`- ${finding}`))
  process.exit(1)
}

console.log(`Theme gate passed across ${files.length} files with ${exemptions.size} documented exemptions.`)
