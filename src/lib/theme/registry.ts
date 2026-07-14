export const THEMES = [
  { id: 'oasis-dark', label: 'Oasis Dark' },
  { id: 'oasis-light', label: 'Oasis Light' },
  { id: 'oasis-contrast', label: 'High Contrast' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = THEMES[0].id
export const THEME_STORAGE_KEY = 'oasis-theme'
export const THEME_COOKIE_NAME = 'oasis-theme'

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some(theme => theme.id === value)
}
