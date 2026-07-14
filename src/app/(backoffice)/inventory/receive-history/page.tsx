'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

interface ManifestItem {
  inventoryid: string
  strain: string | null
  inventorytype: number
  inventory_type_name: string
  quantity: number
  price: number
}

interface Manifest {
  manifestid: string
  sender_name: string
  sender_license: string
  sender_city: string
  transporter_name: string
  transporter_vehicle: string
  total_item_count: number
  total_quantity: number
  total_value: number
  fulfilled: boolean
  deleted: boolean
  date: string
  items: ManifestItem[]
}

function fmtDate(iso: string | null): string {
  if (!iso) return '\u2014'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtMoney(n: number | null): string {
  if (n == null) return '\u2014'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}


export default function ReceiveHistoryPage() {
  const { locationId, locationName, hydrated } = useSelectedLocation()
  const [manifests, setManifests] = useState<Manifest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [totalItems, setTotalItems] = useState(0)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (locationId) params.set('location_id', locationId)

    try {
      const res = await fetch(`/api/inventory/receive-history?${params}`, { cache: 'no-store' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to load receive history')
        setLoading(false)
        return
      }
      const data = await res.json()
      setManifests(data.manifests ?? [])
      setTotal(data.total_manifests ?? 0)
      setTotalItems(data.total_items ?? 0)
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }, [locationId])

  useEffect(() => {
    if (hydrated) void Promise.resolve().then(fetchHistory)
  }, [hydrated, fetchHistory])

  const filtered = search
    ? manifests.filter(m =>
        m.sender_name.toLowerCase().includes(search.toLowerCase()) ||
        m.manifestid.includes(search) ||
        m.transporter_name.toLowerCase().includes(search.toLowerCase()) ||
        m.sender_license.includes(search)
      )
    : manifests

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory" className="p-2 rounded-lg bg-surface border border-edge hover:bg-raised text-secondary hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-primary">Receive History</h1>
          <p className="text-sm text-secondary">{locationName} &mdash; {total} manifest{total !== 1 ? 's' : ''}, {totalItems.toLocaleString()} items</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by sender, manifest ID, transporter, or license..."
          className="w-full max-w-md h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-edge border-t-emerald-400 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-danger/30 border border-danger rounded-lg px-4 py-3 text-sm text-danger">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-edge rounded-xl p-12 text-center">
          <p className="text-muted">No received manifests found{search ? ' matching your search' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            return (
              <div key={m.manifestid} className="bg-surface border border-edge rounded-xl overflow-hidden">
                <button onClick={() => toggle(m.manifestid)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-raised/30 transition-colors">
                  <svg className={`w-4 h-4 text-secondary shrink-0 transition-transform ${expandedId === m.manifestid ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="w-40 shrink-0">
                    <p className="text-sm text-primary">{fmtDate(m.date)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary truncate">{m.sender_name}</p>
                    <p className="text-xs text-muted">{m.sender_city}</p>
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <span className="text-sm font-medium text-primary">{m.total_item_count}</span>
                    <span className="text-xs text-muted ml-1">item{m.total_item_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <span className="text-sm text-primary tabular-nums">{fmtMoney(m.total_value)}</span>
                  </div>
                  <div className="w-24 text-right shrink-0">
                    {m.fulfilled ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-accent/50 text-accent border-accent">Received</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-warning/50 text-warning border-warning">Pending</span>
                    )}
                  </div>
                </button>

                {expandedId === m.manifestid && (
                  <div className="border-t border-edge px-5 py-4 bg-surface/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                      <div><span className="text-muted uppercase">Sender</span><p className="text-primary mt-0.5">{m.sender_name}</p></div>
                      <div><span className="text-muted uppercase">License #</span><p className="text-primary mt-0.5">{m.sender_license || '\u2014'}</p></div>
                      <div><span className="text-muted uppercase">Transporter</span><p className="text-primary mt-0.5">{m.transporter_name || '\u2014'}</p></div>
                      <div><span className="text-muted uppercase">Vehicle</span><p className="text-primary mt-0.5">{m.transporter_vehicle || '\u2014'}</p></div>
                      <div><span className="text-muted uppercase">Manifest ID</span><p className="text-primary font-mono mt-0.5">{m.manifestid}</p></div>
                      <div><span className="text-muted uppercase">Total Qty</span><p className="text-primary mt-0.5">{m.total_quantity.toLocaleString()}</p></div>
                      <div><span className="text-muted uppercase">Total Value</span><p className="text-primary mt-0.5">{fmtMoney(m.total_value)}</p></div>
                      <div><span className="text-muted uppercase">Date</span><p className="text-primary mt-0.5">{fmtDate(m.date)}</p></div>
                    </div>

                    {m.items.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted uppercase border-b border-edge">
                              <th className="text-left pb-2 pr-4">Inventory ID</th>
                              <th className="text-left pb-2 pr-4">Type</th>
                              <th className="text-left pb-2 pr-4">Strain</th>
                              <th className="text-right pb-2 pr-4">Qty</th>
                              <th className="text-right pb-2">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.items.map((item, idx) => (
                              <tr key={idx} className="border-b border-edge/30">
                                <td className="py-1.5 pr-4 text-secondary font-mono">{item.inventoryid}</td>
                                <td className="py-1.5 pr-4 text-primary">{item.inventory_type_name}</td>
                                <td className="py-1.5 pr-4 text-secondary">{item.strain ?? '\u2014'}</td>
                                <td className="py-1.5 pr-4 text-right text-primary tabular-nums">{item.quantity}</td>
                                <td className="py-1.5 text-right text-primary tabular-nums">{fmtMoney(item.price)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
