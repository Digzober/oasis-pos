'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { useCashDrawer } from '@/hooks/useCashDrawer'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  shift_lead: 'Shift Lead',
  budtender: 'Budtender',
}

export default function TerminalHeader() {
  const { session, logout } = useSession()
  const { drawer } = useCashDrawer(session?.registerId ?? '')
  const [now, setNow] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const drawerOpen = drawer?.status === 'open'

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 px-5 flex items-center shrink-0">
      {/* Logo + Location */}
      <div className="flex items-center min-w-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
          O
        </div>
        <span className="text-sm font-medium text-gray-200 ml-3 truncate">
          Oasis
          <span className="text-gray-600 mx-1.5">&middot;</span>
          {session?.locationName ?? 'Loading...'}
        </span>
      </div>

      {/* Divider */}
      <div className="border-l border-gray-800 h-6 mx-5 shrink-0" />

      {/* Date / Time */}
      <div className="text-xs text-gray-500 font-mono tabular-nums whitespace-nowrap">
        {dateStr} &middot; {timeStr}
      </div>

      {/* Divider */}
      <div className="border-l border-gray-800 h-6 mx-5 shrink-0" />

      {/* Drawer Status */}
      <div className="flex items-center gap-2 whitespace-nowrap">
        {drawerOpen ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs text-emerald-400">Drawer Open</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-red-400/60 shrink-0" />
            <span className="text-xs text-red-400/60">No Drawer</span>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="border-l border-gray-800 h-6 mx-5 shrink-0" />

      {/* Employee + Menu */}
      <div className="flex items-center gap-3 shrink-0 relative">
        <span className="text-sm text-gray-400 whitespace-nowrap">
          {session?.employeeName ?? ''}
          {session?.role && (
            <span className="text-gray-600 ml-1">
              ({ROLE_LABELS[session.role] ?? session.role})
            </span>
          )}
        </span>

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Menu"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect y="2" width="16" height="1.5" rx="0.75" />
            <rect y="7.25" width="16" height="1.5" rx="0.75" />
            <rect y="12.5" width="16" height="1.5" rx="0.75" />
          </svg>
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-4 top-12 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1 z-50">
              {/* Mobile employee info */}
              <div className="px-3 py-2 border-b border-gray-700 sm:hidden">
                <p className="text-gray-50 text-sm font-medium">{session?.employeeName}</p>
                <p className="text-xs text-gray-400">{ROLE_LABELS[session?.role ?? '']}</p>
              </div>

              {/* Close Drawer (if open) */}
              {drawerOpen && (
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    // eslint-disable-next-line no-console
                    console.log('[TerminalHeader] Close Drawer clicked')
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                >
                  Close Drawer
                </button>
              )}

              {/* Reprint Receipt */}
              <button
                onClick={() => {
                  setMenuOpen(false)
                  // eslint-disable-next-line no-console
                  console.log('[TerminalHeader] Reprint Receipt clicked')
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
              >
                Reprint Receipt
              </button>

              {/* Divider */}
              <div className="border-t border-gray-700 my-1" />

              {/* Log Out */}
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
              >
                Log Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
