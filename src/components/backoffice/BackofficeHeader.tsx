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
    <header className="h-14 bg-surface border-b border-edge flex items-center px-4 gap-4 shrink-0">
      <button onClick={onToggleSidebar} className="w-9 h-9 flex items-center justify-center text-secondary hover:bg-raised rounded-lg">
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-primary font-bold text-xs">O</div>
        <span className="text-primary font-semibold text-sm hidden sm:block">Oasis Cannabis</span>
      </div>

      <div className="flex-1 min-w-0 hidden md:block px-4">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <LocationSwitcher />

        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 text-sm text-secondary hover:text-primary">
            <div className="w-8 h-8 bg-raised rounded-full flex items-center justify-center text-xs font-medium text-secondary">
              {session?.employeeName?.charAt(0) ?? '?'}
            </div>
            <span className="hidden lg:block">{session?.employeeName}</span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-edge rounded-lg shadow-xl z-50 py-1">
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
