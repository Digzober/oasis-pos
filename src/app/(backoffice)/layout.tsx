'use client'

import { useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import { useSession } from '@/hooks/useSession'
import Sidebar from '@/components/backoffice/Sidebar'
import BackofficeHeader from '@/components/backoffice/BackofficeHeader'

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(Cookies.get('sidebar-collapsed') === 'true')
  }, [])

  const toggleSidebar = () => {
    const next = !collapsed
    setCollapsed(next)
    Cookies.set('sidebar-collapsed', String(next), { expires: 365 })
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please log in to access the backoffice</p>
          <a href="/login" className="text-emerald-400 hover:text-emerald-300">Go to Login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <BackofficeHeader onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 min-h-0">
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
