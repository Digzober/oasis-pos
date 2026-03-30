'use client'

import { useSession } from '@/hooks/useSession'

export default function CheckoutPage() {
  const { session, isLoading, logout } = useSession()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="text-gray-400 text-sm">
            {session?.employeeName} — {session?.locationName}
          </p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-gray-700 text-sm hover:bg-gray-600 transition-colors"
        >
          Log Out
        </button>
      </div>
      <div className="rounded-xl border border-gray-700 p-12 text-center text-gray-500">
        POS checkout interface coming soon
      </div>
    </div>
  )
}
