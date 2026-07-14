'use client'

import { Check } from 'lucide-react'
import { THEMES } from '@/lib/theme/registry'
import { useTheme } from '@/lib/theme/ThemeProvider'

export function ThemePicker() {
  const { theme: activeTheme, setTheme } = useTheme()

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Color theme">
      {THEMES.map(theme => {
        const selected = activeTheme === theme.id
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-theme={theme.id}
            onClick={() => setTheme(theme.id)}
            className="group rounded-xl border border-edge bg-bg p-1 text-left shadow-sm transition hover:border-edge-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="block rounded-lg border border-edge bg-surface p-3">
              <span className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
                <span className="ml-auto h-2 w-12 rounded-full bg-raised" />
              </span>
              <span className="grid grid-cols-[2.5rem_1fr] gap-2">
                <span className="rounded-md bg-raised p-2">
                  <span className="mb-2 block h-2 rounded-full bg-accent" />
                  <span className="mb-1 block h-1.5 rounded-full bg-edge-strong" />
                  <span className="block h-1.5 rounded-full bg-edge" />
                </span>
                <span className="rounded-md border border-edge bg-surface p-2">
                  <span className="mb-2 block h-2 w-3/5 rounded-full bg-primary" />
                  <span className="mb-1 block h-1.5 rounded-full bg-muted" />
                  <span className="block h-4 w-1/2 rounded bg-accent-soft" />
                </span>
              </span>
            </span>
            <span className="flex items-center justify-between px-2 py-2 text-sm font-medium text-primary">
              {theme.label}
              <span className={`grid h-5 w-5 place-items-center rounded-full border ${selected ? 'border-accent bg-accent text-accent-fg' : 'border-edge-strong text-transparent'}`}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
