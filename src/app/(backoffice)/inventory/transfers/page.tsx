'use client'

import { useState, useEffect } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Transfer = any

export default function TransfersPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([])
  const [showNew, setShowNew] = useState(false)
  const [destId, setDestId] = useState('')
  const [notes, setNotes] = useState('')
  const [transferItems, setTransferItems] = useState<Array<{ inventory_item_id: string; quantity: number; name: string }>>([])
  const [itemSearch, setItemSearch] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hydrated) return
    const params = new URLSearchParams()
    if (locationId) params.set('location_id', locationId)
    const qs = params.toString()
    fetch(`/api/inventory/transfers${qs ? `?${qs}` : ''}`).then(r => r.json()).then(d => { setTransfers(d.transfers ?? []); setLoading(false) })
    fetch('/api/auth/locations').then(r => r.json()).then(d => setLocations(d.locations ?? []))
  }, [hydrated, locationId])

  const searchInventory = async () => {
    if (!itemSearch.trim()) return
    const res = await fetch(`/api/inventory?search=${encodeURIComponent(itemSearch)}&per_page=10`)
    if (res.ok) { const data = await res.json(); setSearchResults(data.items ?? []) }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addToTransfer = (item: any) => {
    if (transferItems.find(t => t.inventory_item_id === item.id)) return
    setTransferItems(prev => [...prev, { inventory_item_id: item.id, quantity: 1, name: item.products?.name ?? 'Item' }])
    setSearchResults([])
    setItemSearch('')
  }

  const submitTransfer = async () => {
    if (!destId || transferItems.length === 0) { setError('Select destination and items'); return }
    setCreating(true); setError('')
    const res = await fetch('/api/inventory/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination_location_id: destId, items: transferItems.map(i => ({ inventory_item_id: i.inventory_item_id, quantity: i.quantity })), notes: notes || null }),
    })
    if (res.ok) {
      setShowNew(false); setTransferItems([]); setDestId(''); setNotes('')
      const data = await res.json()
      setTransfers(prev => [data, ...prev])
    } else { const d = await res.json(); setError(d.error ?? 'Failed') }
    setCreating(false)
  }

  const inputCls = "w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  const STATUS_COLORS: Record<string, string> = { in_transit: 'text-amber-400', received: 'text-emerald-400', created: 'text-blue-400' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Transfers</h1>
        <button onClick={() => setShowNew(true)} className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">New Transfer</button>
      </div>

      {/* New transfer modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-50">New Transfer</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-200">✕</button>
            </div>
            <label className="block"><span className="text-xs text-gray-400">Destination *</span>
              <select value={destId} onChange={e => setDestId(e.target.value)} className={inputCls}>
                <option value="">Select location...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            {/* Item search */}
            <div className="flex gap-2">
              <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchInventory()}
                placeholder="Search inventory..." className={inputCls} />
              <button onClick={searchInventory} className="px-3 h-10 bg-gray-700 text-gray-300 rounded-lg text-sm shrink-0">Find</button>
            </div>
            {searchResults.length > 0 && (
              <div className="bg-gray-900 rounded-lg max-h-32 overflow-y-auto">
                {searchResults.map((r: Transfer) => (
                  <button key={r.id} onClick={() => addToTransfer(r)} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    {r.products?.name} — Qty: {r.quantity}
                  </button>
                ))}
              </div>
            )}
            {transferItems.length > 0 && (
              <div className="space-y-2">
                {transferItems.map((ti, idx) => (
                  <div key={ti.inventory_item_id} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-50 flex-1">{ti.name}</span>
                    <input type="number" value={ti.quantity} onChange={e => setTransferItems(p => p.map((t, i) => i === idx ? { ...t, quantity: parseInt(e.target.value) || 1 } : t))}
                      className="w-20 h-8 px-2 bg-gray-900 border border-gray-600 rounded text-gray-50 text-sm" />
                    <button onClick={() => setTransferItems(p => p.filter((_, i) => i !== idx))} className="text-red-400 text-xs">Remove</button>
                  </div>
                ))}
              </div>
            )}
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className={inputCls + ' h-16'} />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={submitTransfer} disabled={creating} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending transfers */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Items</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-500">No transfers</td></tr>
            ) : transfers.map((t: Transfer) => (
              <tr key={t.id} className="border-b border-gray-700/50">
                <td className="px-4 py-2.5 text-gray-300 text-xs tabular-nums">{t.id?.slice(0, 8)}</td>
                <td className="px-4 py-2.5 text-gray-50">{t.items?.length ?? 0} items</td>
                <td className={`px-4 py-2.5 text-xs font-medium capitalize ${STATUS_COLORS[t.status] ?? 'text-gray-400'}`}>{t.status}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
