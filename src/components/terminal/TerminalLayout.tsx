'use client'

import { useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import TerminalHeader from './TerminalHeader'
import CartSidebar from './CartSidebar'
import StatusBar from './StatusBar'
import { refreshAllCaches } from '@/lib/offline/offlineCache'
import { start as startSync } from '@/lib/offline/syncWorker'

interface TerminalLayoutProps {
  children: React.ReactNode
}

export default function TerminalLayout({ children }: TerminalLayoutProps) {
  const { session, isLoading } = useSession()

  // Register service worker and start background sync
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    startSync()

    // Refresh offline caches periodically
    if (session?.locationId) {
      refreshAllCaches(session.locationId)
      const id = setInterval(() => refreshAllCaches(session.locationId), 15 * 60 * 1000)
      return () => clearInterval(id)
    }
  }, [session?.locationId])

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
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
        <CartSidebar />
      </div>
      <StatusBar />
    </div>
  )
}
