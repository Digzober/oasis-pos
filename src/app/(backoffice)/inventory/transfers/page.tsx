'use client'

import { useState, useEffect } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'
import { DENSE_BESPOKE_TABLE_CLASS } from '@/lib/constants/tableDensity'

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

  const inputCls = "w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
  const STATUS_COLORS: Record<string, string> = { in_transit: 'text-warning', received: 'text-accent', created: 'text-info' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Transfers</h1>
        <button onClick={() => setShowNew(true)} className="text-sm px-3 py-1.5 bg-accent text-primary rounded-lg hover:bg-accent">New Transfer</button>
      </div>

      {/* New transfer modal */}
      {showNew && (
        <div className="fixed inset-0 bg-bg/60 z-50 flex items-center justify-center">
          <div className="bg-surface border border-edge rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">New Transfer</h2>
              <button onClick={() => setShowNew(false)} className="text-secondary hover:text-primary">✕</button>
            </div>
            <label className="block"><span className="text-xs text-secondary">Destination *</span>
              <select value={destId} onChange={e => setDestId(e.target.value)} className={inputCls}>
                <option value="">Select location...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            {/* Item search */}
            <div className="flex gap-2">
              <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchInventory()}
                placeholder="Search inventory..." className={inputCls} />
              <button onClick={searchInventory} className="px-3 h-10 bg-raised text-secondary rounded-lg text-sm shrink-0">Find</button>
            </div>
            {searchResults.length > 0 && (
              <div className="bg-bg rounded-lg max-h-32 overflow-y-auto">
                {searchResults.map((r: Transfer) => (
                  <button key={r.id} onClick={() => addToTransfer(r)} className="w-full text-left px-3 py-2 text-sm text-secondary hover:bg-raised">
                    {r.products?.name} — Qty: {r.quantity}
                  </button>
                ))}
              </div>
            )}
            {transferItems.length > 0 && (
              <div className="space-y-2">
                {transferItems.map((ti, idx) => (
                  <div key={ti.inventory_item_id} className="flex items-center gap-2 text-sm">
                    <span className="text-primary flex-1">{ti.name}</span>
                    <input type="number" value={ti.quantity} onChange={e => setTransferItems(p => p.map((t, i) => i === idx ? { ...t, quantity: parseInt(e.target.value) || 1 } : t))}
                      className="w-20 h-8 px-2 bg-bg border border-edge-strong rounded text-primary text-sm" />
                    <button onClick={() => setTransferItems(p => p.filter((_, i) => i !== idx))} className="text-danger text-xs">Remove</button>
                  </div>
                ))}
              </div>
            )}
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className={inputCls + ' h-16'} />
            {error && <p className="text-danger text-sm">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 bg-raised text-secondary rounded-lg text-sm">Cancel</button>
              <button onClick={submitTransfer} disabled={creating} className="px-4 py-1.5 bg-accent text-primary rounded-lg text-sm disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending transfers */}
      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <table data-density="compact" className={`${DENSE_BESPOKE_TABLE_CLASS} w-full`}>
          <thead>
            <tr className="border-b border-edge text-secondary text-xs uppercase">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Items</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-muted">Loading...</td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-muted">No transfers</td></tr>
            ) : transfers.map((t: Transfer) => (
              <tr key={t.id} className="border-b border-edge/50">
                <td className="px-4 py-2.5 text-secondary text-xs tabular-nums">{t.id?.slice(0, 8)}</td>
                <td className="px-4 py-2.5 text-primary">{t.items?.length ?? 0} items</td>
                <td className={`px-4 py-2.5 text-xs font-medium capitalize ${STATUS_COLORS[t.status] ?? 'text-secondary'}`}>{t.status}</td>
                <td className="px-4 py-2.5 text-secondary text-xs">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
