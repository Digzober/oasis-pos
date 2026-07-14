'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { Menu } from 'lucide-react'
import LocationSwitcher from './LocationSwitcher'
import Breadcrumbs from './Breadcrumbs'

export default function BackofficeHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { session, logout } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="h-12 bg-surface border-b border-edge-strong flex items-center px-3 gap-3 shrink-0">
      <button onClick={onToggleSidebar} className="flex h-8 w-8 items-center justify-center rounded-sm text-muted hover:bg-raised hover:text-primary">
        <Menu size={18} />
      </button>

      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-accent text-xs font-bold text-accent-fg">O</div>
        <span className="hidden text-[13px] font-semibold text-primary sm:block">Oasis Cannabis</span>
      </div>

      <div className="flex-1 min-w-0 hidden md:block px-4">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <LocationSwitcher />

        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-8 items-center gap-2 rounded-sm px-1.5 text-[13px] text-secondary hover:bg-raised hover:text-primary">
            <div className="flex h-6 w-6 items-center justify-center rounded-sm border border-edge bg-raised text-xs font-medium text-secondary">
              {session?.employeeName?.charAt(0) ?? '?'}
            </div>
            <span className="hidden lg:block">{session?.employeeName}</span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-edge-strong rounded-sm shadow-lg z-50 py-1">
                <div className="px-3 py-2 border-b border-edge">
                  <p className="text-sm text-primary font-medium">{session?.employeeName}</p>
                  <p className="text-xs text-secondary capitalize">{session?.role?.replace('_', ' ')}</p>
                </div>
                <button onClick={() => { setMenuOpen(false); logout() }}
                  className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-raised">Log Out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
