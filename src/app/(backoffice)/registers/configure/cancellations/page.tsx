'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

const TABS = [
  { label: 'Guestlist Status', href: '/registers/configure/guestlist' },
  { label: 'Order Workflow', href: '/registers/configure/workflow' },
  { label: 'Cards', href: '/registers/configure/cards' },
  { label: 'Adjustments', href: '/registers/configure/adjustments' },
  { label: 'Returns', href: '/registers/configure/returns' },
  { label: 'Cancellations', href: '/registers/configure/cancellations' },
  { label: 'Voids', href: '/registers/configure/voids' },
  { label: 'Settings', href: '/registers/configure/settings' },
]

interface TransactionReason {
  id: string
  name: string
}

export default function CancellationsPage() {
  const pathname = usePathname()
  const [reasons, setReasons] = useState<TransactionReason[]>([])
  const [loading, setLoading] = useState(true)
  const [newReason, setNewReason] = useState('')

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/registers/configure/transaction-reasons?reason_type=cancellation', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setReasons(data.reasons ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const addReason = async () => {
    if (!newReason.trim()) return
    const res = await fetch('/api/registers/configure/transaction-reasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newReason.trim(), reason_type: 'cancellation' }),
    })
    if (res.ok) {
      setNewReason('')
      await fetchData()
    }
  }

  const removeReason = async (id: string) => {
    const res = await fetch('/api/registers/configure/transaction-reasons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) await fetchData()
  }

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-gray-700 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              pathname === tab.href
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <h1 className="text-xl font-bold text-gray-50 mb-6">Cancellation Reasons</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {reasons.length === 0 ? (
              <p className="text-sm text-gray-500">No cancellation reasons configured</p>
            ) : reasons.map(reason => (
              <span key={reason.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-50">
                {reason.name}
                <button onClick={() => removeReason(reason.id)} className="text-gray-400 hover:text-red-400" aria-label={`Remove ${reason.name}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={newReason}
              onChange={e => setNewReason(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addReason() }}
              placeholder="New cancellation reason"
              className={inputCls}
            />
            <button onClick={addReason} disabled={!newReason.trim()} className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap">
              Add Reason
            </button>
          </div>
        </>
      )}
    </div>
  )
}
