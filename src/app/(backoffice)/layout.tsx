'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from '@/hooks/useSession'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: '▦' },
  { label: 'Transactions', href: '/reports/transactions', icon: '⊞' },
  { label: 'Sales Report', href: '/reports/sales', icon: '◩' },
  { label: 'Inventory', href: '/inventory', icon: '▤' },
  { label: 'Products', href: '/products', icon: '◫' },
  { label: 'Employees', href: '/employees', icon: '◉', disabled: true },
  { label: 'Settings', href: '/settings', icon: '⚙', disabled: true },
]

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const { session, isLoading, logout } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-700 rounded-lg mr-3 lg:hidden"
        >
          ☰
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">O</div>
          <span className="text-gray-50 font-semibold text-sm">Oasis Backoffice</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{session?.employeeName}</span>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
            Log Out
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'} lg:w-56 bg-gray-800 border-r border-gray-700 flex flex-col shrink-0 transition-all`}>
          <nav className="flex-1 py-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.disabled ? '#' : item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    item.disabled
                      ? 'text-gray-600 cursor-not-allowed'
                      : active
                        ? 'bg-gray-700 text-emerald-400 font-medium'
                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-gray-50'
                  }`}
                  onClick={(e) => item.disabled && e.preventDefault()}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                  {item.disabled && <span className="text-[10px] text-gray-600 ml-auto">Soon</span>}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
