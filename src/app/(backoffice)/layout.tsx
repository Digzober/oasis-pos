'use client'

import { useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import { useSession } from '@/hooks/useSession'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'
import Sidebar from '@/components/backoffice/Sidebar'
import BackofficeHeader from '@/components/backoffice/BackofficeHeader'

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSession()
  const { locationId } = useSelectedLocation()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    void Promise.resolve().then(() => setCollapsed(Cookies.get('sidebar-collapsed') === 'true'))
  }, [])

  const toggleSidebar = () => {
    const next = !collapsed
    setCollapsed(next)
    Cookies.set('sidebar-collapsed', String(next), { expires: 365 })
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-edge border-t-accent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary mb-4">Please log in to access the backoffice</p>
          <a href="/login" className="text-accent hover:text-accent">Go to Login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      <BackofficeHeader onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 min-h-0">
        <Sidebar collapsed={collapsed} />
        <main key={locationId ?? 'all'} className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
