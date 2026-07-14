import { readFile, readdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const roots = ['src/app', 'src/components']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css'])
const palettes = 'gray|zinc|slate|neutral|stone|red|green|emerald|blue|amber|purple'
const classPattern = new RegExp(`((?:[a-z0-9-]+:)*)(bg|text|border|ring|outline|divide|from|via|to|fill|stroke|shadow)-((?:${palettes})(?:-(\\d{2,3}))?|black|white)(\\/\\d+)?`, 'gi')
const placeholderPattern = new RegExp(`((?:[a-z0-9-]+:)*)placeholder-(?:${palettes})(?:-\\d{2,3})?(\\/\\d+)?`, 'gi')

const statusFor = {
  red: 'danger',
  green: 'success',
  emerald: 'accent',
  blue: 'info',
  amber: 'warning',
  purple: 'info',
}

function neutralToken(utility, color, shade) {
  if (utility === 'text') {
    if (color === 'black') return 'inverse'
    if (color === 'white' || !shade || Number(shade) <= 200) return 'primary'
    if (Number(shade) <= 400) return 'secondary'
    return 'muted'
  }
  if (utility === 'bg' || ['from', 'via', 'to'].includes(utility)) {
    if (color === 'black' || Number(shade) >= 900) return 'bg'
    if (color === 'white' || !shade || Number(shade) === 800) return 'surface'
    if (Number(shade) >= 600) return 'raised'
    return 'overlay'
  }
  if (utility === 'border' || utility === 'divide') {
    return shade && Number(shade) <= 600 ? 'edge-strong' : 'edge'
  }
  if (utility === 'ring' || utility === 'outline') return 'ring'
  if (utility === 'fill' || utility === 'stroke') return 'muted'
  if (utility === 'shadow') return 'edge'
  return 'muted'
}

function statusToken(utility, status, shade, opacity) {
  if (utility === 'bg' || ['from', 'via', 'to'].includes(utility)) {
    return !opacity && shade && Number(shade) <= 200 ? `${status}-soft` : status
  }
  if (utility === 'border' || utility === 'ring' || utility === 'outline' || utility === 'divide') return status
  if (utility === 'fill' || utility === 'stroke') {
    const chart = { accent: 'chart-1', success: 'chart-1', warning: 'chart-3', danger: 'chart-5', info: 'chart-6' }
    return chart[status]
  }
  return status
}

function transform(source) {
  return source
    .replace(placeholderPattern, (_match, variants, opacity = '') => `${variants}placeholder:text-muted${opacity}`)
    .replace(classPattern, (_match, variants, utility, colorName, shade, opacity = '') => {
      const color = colorName.toLowerCase().split('-')[0]
      const status = statusFor[color]
      const token = status
        ? statusToken(utility.toLowerCase(), status, shade, opacity)
        : neutralToken(utility.toLowerCase(), color, shade)
      return `${variants}${utility.toLowerCase()}-${token}${opacity}`
    })
}

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return filesIn(path)
    return extensions.has(extname(entry.name)) ? [path] : []
  }))
  return nested.flat()
}

let changed = 0
for (const root of roots) {
  for (const path of await filesIn(root)) {
    const before = await readFile(path, 'utf8')
    const after = transform(before)
    if (after !== before) {
      await writeFile(path, after)
      changed += 1
    }
  }
}

process.stdout.write(`Converted palette utilities in ${changed} files.\n`)
