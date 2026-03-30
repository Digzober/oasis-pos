'use client'

import { useSession } from '@/hooks/useSession'
import TerminalHeader from './TerminalHeader'
import CartSidebar from './CartSidebar'
import StatusBar from './StatusBar'

interface TerminalLayoutProps {
  children: React.ReactNode
}

export default function TerminalLayout({ children }: TerminalLayoutProps) {
  const { isLoading } = useSession()

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <TerminalHeader />
      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
        {/* Cart sidebar */}
        <CartSidebar />
      </div>
      <StatusBar />
    </div>
  )
}
