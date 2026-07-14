'use client'

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react'
import {
  DEFAULT_THEME,
  isThemeId,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  type ThemeId,
} from './registry'

const THEME_CHANGE_EVENT = 'oasis-theme-change'

function readTheme(): ThemeId {
  if (typeof document === 'undefined') return DEFAULT_THEME
  const value = document.documentElement.dataset.theme
  return isThemeId(value) ? value : DEFAULT_THEME
}

function subscribe(onStoreChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY || !isThemeId(event.newValue)) return
    document.documentElement.dataset.theme = event.newValue
    onStoreChange()
  }
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange)
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange)
    window.removeEventListener('storage', handleStorage)
  }
}

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME)

  const setTheme = useCallback((nextTheme: ThemeId) => {
    if (!isThemeId(nextTheme)) return
    document.documentElement.dataset.theme = nextTheme
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // Cookie persistence still works when storage access is blocked.
    }
    document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(nextTheme)}; Path=/; Max-Age=31536000; SameSite=Lax`
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within ThemeProvider')
  return value
}
