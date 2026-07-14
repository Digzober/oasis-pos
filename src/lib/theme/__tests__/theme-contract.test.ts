import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const registryPath = resolve(root, 'src/lib/theme/registry.ts')
const providerPath = resolve(root, 'src/lib/theme/ThemeProvider.tsx')
const bootstrapPath = resolve(root, 'src/lib/theme/bootstrap.tsx')
const pickerPath = resolve(root, 'src/components/theme/ThemePicker.tsx')
const globalsPath = resolve(root, 'src/app/globals.css')
const layoutPath = resolve(root, 'src/app/layout.tsx')

function source(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

describe('universal theme contract', () => {
  it('defines all shipped themes in one registry and one CSS block each', () => {
    expect(existsSync(registryPath)).toBe(true)
    const registry = source(registryPath)
    const globals = source(globalsPath)

    for (const id of ['oasis-dark', 'oasis-light', 'oasis-contrast']) {
      expect(registry, id).toContain(`id: '${id}'`)
      expect(globals.match(new RegExp(`\\[data-theme=["']${id}["']\\]`, 'g'))?.length, id).toBe(1)
    }
    expect(registry).toContain('export const THEMES')
  })

  it('keeps provider and picker registry-driven with no hardcoded theme branches', () => {
    expect(existsSync(providerPath)).toBe(true)
    expect(existsSync(pickerPath)).toBe(true)
    const provider = source(providerPath)
    const picker = source(pickerPath)

    expect(provider).toContain("from './registry'")
    expect(picker).toContain('THEMES.map')
    expect(provider).not.toMatch(/theme\s*===\s*['"]oasis-/)
    expect(picker).not.toMatch(/\[\s*['"]oasis-dark/)
  })

  it('places an inline theme bootstrap before body content to prevent FOUC', () => {
    expect(existsSync(bootstrapPath)).toBe(true)
    const bootstrap = source(bootstrapPath)
    const layout = source(layoutPath)

    expect(bootstrap).toContain('localStorage.getItem')
    expect(bootstrap).toContain('document.cookie')
    expect(bootstrap).toContain('document.documentElement.dataset.theme')
    expect(layout).toContain('<ThemeBootstrap />')
    expect(layout.indexOf('<ThemeBootstrap />')).toBeLessThan(layout.indexOf('<body'))
    expect(layout).toContain('suppressHydrationWarning')
  })
})
