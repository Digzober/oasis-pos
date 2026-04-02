'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'

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

export default function TransactionSettingsPage() {
  const pathname = usePathname()
  const [restrictTransactions, setRestrictTransactions] = useState(false)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('22:00')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/registers/configure/settings', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      const s = data.settings ?? {}
      setRestrictTransactions(s.restrict_transaction_hours ?? false)
      setStartTime(s.transaction_hours_start ?? '08:00')
      setEndTime(s.transaction_hours_end ?? '22:00')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const save = async () => {
    setSaving(true)
    await fetch('/api/registers/configure/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restrict_transaction_hours: restrictTransactions,
        transaction_hours_start: startTime,
        transaction_hours_end: endTime,
      }),
    })
    setSaving(false)
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

      <h1 className="text-xl font-bold text-gray-50 mb-6">Transaction Settings</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={restrictTransactions}
                onChange={e => setRestrictTransactions(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <div>
                <span className="text-sm font-medium text-gray-50">Restrict Transactions</span>
                <p className="text-xs text-gray-400 mt-0.5">Prevent transactions outside specified hours</p>
              </div>
            </label>

            {restrictTransactions && (
              <div className="grid grid-cols-2 gap-4 max-w-md ml-7">
                <div>
                  <label className={labelCls}>Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>

          <button onClick={save} disabled={saving} className="px-6 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </>
      )}
    </div>
  )
}
