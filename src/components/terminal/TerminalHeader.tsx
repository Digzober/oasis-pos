'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  shift_lead: 'Shift Lead',
  budtender: 'Budtender',
}

export default function TerminalHeader() {
  const { session, logout } = useSession()
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

  return (
    <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4 shrink-0">
      {/* Left: Logo + Location */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          O
        </div>
        <span className="text-gray-50 font-medium text-sm truncate">
          {session?.locationName ?? 'Loading...'}
        </span>
      </div>

      {/* Center: Date/Time */}
      <div className="flex-1 text-center text-gray-400 text-sm">
        {dateStr} &middot; {timeStr}
      </div>

      {/* Right: Employee + Menu + Logout */}
      <div className="flex items-center gap-3 shrink-0 relative">
        <div className="text-right hidden sm:block">
          <p className="text-gray-50 text-sm font-medium leading-tight">
            {session?.employeeName ?? ''}
          </p>
          <p className="text-xs text-gray-400">
            {ROLE_LABELS[session?.role ?? ''] ?? ''}
          </p>
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-700 transition-colors"
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect y="3" width="20" height="2" rx="1" />
            <rect y="9" width="20" height="2" rx="1" />
            <rect y="15" width="20" height="2" rx="1" />
          </svg>
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-12 z-50 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1">
              <div className="px-3 py-2 border-b border-gray-700 sm:hidden">
                <p className="text-gray-50 text-sm font-medium">{session?.employeeName}</p>
                <p className="text-xs text-gray-400">{ROLE_LABELS[session?.role ?? '']}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
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
