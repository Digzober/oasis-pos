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
    if (hydrated) fetchHistory()
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
        <Link href="/inventory" className="p-2 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-50">Receive History</h1>
          <p className="text-sm text-gray-400">{locationName} &mdash; {total} manifest{total !== 1 ? 's' : ''}, {totalItems.toLocaleString()} items</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by sender, manifest ID, transporter, or license..."
          className="w-full max-w-md h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-gray-700 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
          <p className="text-gray-500">No received manifests found{search ? ' matching your search' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            return (
              <div key={m.manifestid} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <button onClick={() => toggle(m.manifestid)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-700/30 transition-colors">
                  <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expandedId === m.manifestid ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="w-40 shrink-0">
                    <p className="text-sm text-gray-50">{fmtDate(m.date)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-50 truncate">{m.sender_name}</p>
                    <p className="text-xs text-gray-500">{m.sender_city}</p>
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <span className="text-sm font-medium text-gray-50">{m.total_item_count}</span>
                    <span className="text-xs text-gray-500 ml-1">item{m.total_item_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <span className="text-sm text-gray-200 tabular-nums">{fmtMoney(m.total_value)}</span>
                  </div>
                  <div className="w-24 text-right shrink-0">
                    {m.fulfilled ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-900/50 text-emerald-400 border-emerald-700">Received</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-900/50 text-amber-400 border-amber-700">Pending</span>
                    )}
                  </div>
                </button>

                {expandedId === m.manifestid && (
                  <div className="border-t border-gray-700 px-5 py-4 bg-gray-800/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                      <div><span className="text-gray-500 uppercase">Sender</span><p className="text-gray-200 mt-0.5">{m.sender_name}</p></div>
                      <div><span className="text-gray-500 uppercase">License #</span><p className="text-gray-200 mt-0.5">{m.sender_license || '\u2014'}</p></div>
                      <div><span className="text-gray-500 uppercase">Transporter</span><p className="text-gray-200 mt-0.5">{m.transporter_name || '\u2014'}</p></div>
                      <div><span className="text-gray-500 uppercase">Vehicle</span><p className="text-gray-200 mt-0.5">{m.transporter_vehicle || '\u2014'}</p></div>
                      <div><span className="text-gray-500 uppercase">Manifest ID</span><p className="text-gray-200 font-mono mt-0.5">{m.manifestid}</p></div>
                      <div><span className="text-gray-500 uppercase">Total Qty</span><p className="text-gray-200 mt-0.5">{m.total_quantity.toLocaleString()}</p></div>
                      <div><span className="text-gray-500 uppercase">Total Value</span><p className="text-gray-200 mt-0.5">{fmtMoney(m.total_value)}</p></div>
                      <div><span className="text-gray-500 uppercase">Date</span><p className="text-gray-200 mt-0.5">{fmtDate(m.date)}</p></div>
                    </div>

                    {m.items.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 uppercase border-b border-gray-700">
                              <th className="text-left pb-2 pr-4">Inventory ID</th>
                              <th className="text-left pb-2 pr-4">Type</th>
                              <th className="text-left pb-2 pr-4">Strain</th>
                              <th className="text-right pb-2 pr-4">Qty</th>
                              <th className="text-right pb-2">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.items.map((item, idx) => (
                              <tr key={idx} className="border-b border-gray-700/30">
                                <td className="py-1.5 pr-4 text-gray-400 font-mono">{item.inventoryid}</td>
                                <td className="py-1.5 pr-4 text-gray-200">{item.inventory_type_name}</td>
                                <td className="py-1.5 pr-4 text-gray-300">{item.strain ?? '\u2014'}</td>
                                <td className="py-1.5 pr-4 text-right text-gray-200 tabular-nums">{item.quantity}</td>
                                <td className="py-1.5 text-right text-gray-200 tabular-nums">{fmtMoney(item.price)}</td>
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
