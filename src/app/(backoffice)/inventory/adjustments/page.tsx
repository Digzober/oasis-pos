'use client'

import { useState, useEffect } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

const FALLBACK_TYPES = [
  { value: 'count_correction', label: 'Count Correction' },
  { value: 'damage', label: 'Damage' },
  { value: 'theft', label: 'Theft' },
  { value: 'waste', label: 'Waste' },
  { value: 'testing', label: 'Testing Sample' },
  { value: 'other', label: 'Other' },
]

interface AdjustmentType {
  value: string
  label: string
}

export default function AdjustmentsPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [barcode, setBarcode] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [item, setItem] = useState<any>(null)
  const [newQty, setNewQty] = useState('')
  const [adjType, setAdjType] = useState('count_correction')
  const [reason, setReason] = useState('')
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [types, setTypes] = useState<AdjustmentType[]>(FALLBACK_TYPES)

  useEffect(() => {
    let cancelled = false
    async function loadReasons() {
      try {
        const res = await fetch('/api/settings/adjustment-reasons')
        if (!res.ok) return
        const data = await res.json()
        const reasons = data.reasons ?? []
        if (!cancelled && reasons.length > 0) {
          const mapped: AdjustmentType[] = reasons
            .filter((r: { is_active?: boolean }) => r.is_active !== false)
            .map((r: { id: string; name: string; slug?: string }) => ({
              value: r.slug ?? r.id,
              label: r.name,
            }))
          if (mapped.length > 0) {
            setTypes(mapped)
            const first = mapped[0]
            if (first) setAdjType(first.value)
          }
        }
      } catch {
        // Keep fallback types on error
      }
    }
    loadReasons()
    return () => { cancelled = true }
  }, [])

  const search = async () => {
    if (!barcode.trim()) return
    setSearching(true); setItem(null); setError('')
    const params = new URLSearchParams({ search: barcode, per_page: '1' })
    if (locationId) params.set('location_id', locationId)
    const res = await fetch(`/api/inventory?${params}`)
    if (res.ok) {
      const data = await res.json()
      if (data.items?.length > 0) {
        setItem(data.items[0])
        setNewQty(String(data.items[0].quantity))
      } else setError('Item not found')
    }
    setSearching(false)
  }

  const submit = async () => {
    if (!item || !reason.trim()) { setError('Reason is required'); return }
    setSaving(true); setError(''); setSuccess('')
    const res = await fetch(`/api/inventory/${item.id}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment_type: adjType, new_quantity: parseFloat(newQty), reason }),
    })
    if (res.ok) {
      const data = await res.json()
      setSuccess(`Adjusted: ${data.previous_quantity} → ${data.new_quantity} (${data.delta > 0 ? '+' : ''}${data.delta})`)
      setItem({ ...item, quantity: data.new_quantity })
    } else {
      const data = await res.json()
      setError(data.error ?? 'Adjustment failed')
    }
    setSaving(false)
  }

  const delta = item ? parseFloat(newQty || '0') - item.quantity : 0
  const inputCls = "w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-50 mb-6">Inventory Adjustment</h1>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Scan barcode or enter lot number..." className={inputCls} autoFocus />
        <button onClick={search} disabled={searching} className="px-4 h-10 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 shrink-0">
          {searching ? '...' : 'Find'}
        </button>
      </div>

      {item && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
          {/* Item info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-400">Product: </span><span className="text-gray-50">{item.products?.name ?? '—'}</span></div>
            <div><span className="text-gray-400">Room: </span><span className="text-gray-50">{item.rooms?.name ?? '—'}</span></div>
            <div><span className="text-gray-400">Barcode: </span><span className="text-gray-300 text-xs tabular-nums">{item.biotrack_barcode ?? '—'}</span></div>
            <div><span className="text-gray-400">Current Qty: </span><span className="text-gray-50 font-bold">{item.quantity}</span></div>
          </div>

          {/* Adjustment form */}
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-gray-400">New Quantity</span>
              <input type="number" step="0.001" value={newQty} onChange={e => setNewQty(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Type</span>
              <select value={adjType} onChange={e => setAdjType(e.target.value)} className={inputCls}>
                {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>

          {delta !== 0 && (
            <p className={`text-lg font-bold ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              Delta: {delta > 0 ? '+' : ''}{delta}
            </p>
          )}

          <label className="block">
            <span className="text-xs text-gray-400">Reason *</span>
            <textarea value={reason} onChange={e => setReason(e.target.value)} className={inputCls + ' h-16'} placeholder="Required: explain the adjustment" />
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-emerald-400 text-sm">{success}</p>}

          <button onClick={submit} disabled={saving || !reason.trim()}
            className="w-full h-11 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors">
            {saving ? 'Adjusting...' : 'Submit Adjustment'}
          </button>
        </div>
      )}

      {error && !item && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
