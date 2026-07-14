'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { usePermissions } from '@/hooks/usePermissions'
import { useCashDrawer } from '@/hooks/useCashDrawer'
import { PERMS } from '@/lib/constants/permissions'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  shift_lead: 'Shift Lead',
  budtender: 'Budtender',
}

export default function TerminalHeader() {
  const { session, logout } = useSession()
  const { can } = usePermissions()
  const { drawer } = useCashDrawer(session?.registerId ?? '')
  const canAccessBackoffice = can(PERMS.GENERAL.LOGIN_BACKEND)
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
    <header className="h-14 bg-bg border-b border-edge px-5 flex items-center shrink-0">
      {/* Logo + Location */}
      <div className="flex items-center min-w-0">
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0">
          O
        </div>
        <span className="text-sm font-medium text-primary ml-3 truncate">
          Oasis
          <span className="text-muted mx-1.5">&middot;</span>
          {session?.locationName ?? 'Loading...'}
        </span>
      </div>

      {/* Divider */}
      <div className="border-l border-edge h-6 mx-5 shrink-0" />

      {/* Date / Time */}
      <div className="text-xs text-muted font-mono tabular-nums whitespace-nowrap">
        {dateStr} &middot; {timeStr}
      </div>

      {/* Divider */}
      <div className="border-l border-edge h-6 mx-5 shrink-0" />

      {/* Drawer Status */}
      <div className="flex items-center gap-2 whitespace-nowrap">
        {drawerOpen ? (
          <>
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
            <span className="text-xs text-accent">Drawer Open</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-danger/60 shrink-0" />
            <span className="text-xs text-danger/60">No Drawer</span>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="border-l border-edge h-6 mx-5 shrink-0" />

      {/* Employee + Menu */}
      <div className="flex items-center gap-3 shrink-0 relative">
        <span className="text-sm text-secondary whitespace-nowrap">
          {session?.employeeName ?? ''}
          {session?.role && (
            <span className="text-muted ml-1">
              ({ROLE_LABELS[session.role] ?? session.role})
            </span>
          )}
        </span>

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-8 h-8 rounded-lg hover:bg-surface/5 flex items-center justify-center text-muted hover:text-secondary transition-colors"
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
            <div className="absolute right-4 top-12 w-48 bg-surface border border-edge rounded-xl shadow-2xl py-1 z-50">
              {/* Mobile employee info */}
              <div className="px-3 py-2 border-b border-edge sm:hidden">
                <p className="text-primary text-sm font-medium">{session?.employeeName}</p>
                <p className="text-xs text-secondary">{ROLE_LABELS[session?.role ?? '']}</p>
              </div>

              {/* Close Drawer (if open) */}
              {drawerOpen && (
                <button
                  onClick={() => {
                    setMenuOpen(false)
                     
                    console.log('[TerminalHeader] Close Drawer clicked')
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-secondary hover:bg-surface/5 transition-colors"
                >
                  Close Drawer
                </button>
              )}

              {/* Reprint Receipt */}
              <button
                onClick={() => {
                  setMenuOpen(false)
                   
                  console.log('[TerminalHeader] Reprint Receipt clicked')
                }}
                className="w-full text-left px-3 py-2 text-sm text-secondary hover:bg-surface/5 transition-colors"
              >
                Reprint Receipt
              </button>

              {/* Go to Backoffice (permission-gated) */}
              {canAccessBackoffice && (
                <a
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-left px-3 py-2 text-sm text-accent hover:bg-accent/10 transition-colors flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="1" width="6" height="6" rx="1" />
                    <rect x="9" y="1" width="6" height="6" rx="1" />
                    <rect x="1" y="9" width="6" height="6" rx="1" />
                    <rect x="9" y="9" width="6" height="6" rx="1" />
                  </svg>
                  Go to Backoffice
                </a>
              )}

              {/* Divider */}
              <div className="border-t border-edge my-1" />

              {/* Log Out */}
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
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
