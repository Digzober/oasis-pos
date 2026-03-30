'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InvItem = any

export default function InventoryListPage() {
  const [items, setItems] = useState<InvItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const perPage = 50
  const totalPages = Math.ceil(total / perPage)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (search) params.set('search', search)
    const res = await fetch(`/api/inventory?${params}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data.items ?? [])
      setTotal(data.pagination?.total ?? 0)
    }
    setLoading(false)
  }, [page, search])

  useEffect(() => { fetchData() }, [fetchData])

  const totalValue = items.reduce((s: number, i: InvItem) => s + (i.cost_per_unit ?? 0) * i.quantity, 0)
  const lowStock = items.filter((i: InvItem) => i.quantity <= 5).length
  const expired = items.filter((i: InvItem) => i.expiration_date && new Date(i.expiration_date) < new Date()).length

  const exportCsv = () => {
    const headers = ['Product', 'Barcode', 'Room', 'Qty', 'Cost', 'Received', 'Expiration']
    const rows = items.map((i: InvItem) => [
      i.products?.name ?? '', i.biotrack_barcode ?? '', i.rooms?.name ?? '',
      i.quantity, i.cost_per_unit ?? '', i.received_at ? new Date(i.received_at).toLocaleDateString() : '',
      i.expiration_date ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'inventory.csv'; a.click()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Inventory</h1>
        <div className="flex gap-2">
          <Link href="/inventory/receive" className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">Receive Inventory</Link>
          <button onClick={exportCsv} className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Export CSV</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card label="Total Items" value={String(total)} />
        <Card label="Total Value" value={fmt(totalValue)} />
        <Card label="Low Stock" value={String(lowStock)} color={lowStock > 0 ? 'text-amber-400' : undefined} />
        <Card label="Expired" value={String(expired)} color={expired > 0 ? 'text-red-400' : undefined} />
      </div>

      {/* Search */}
      <div className="mb-4">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search barcode or lot number..." className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 w-64" />
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-left px-4 py-3">Barcode</th>
              <th className="text-left px-4 py-3">Room</th>
              <th className="text-right px-4 py-3">Qty</th>
              <th className="text-right px-4 py-3">Reserved</th>
              <th className="text-right px-4 py-3">Available</th>
              <th className="text-right px-4 py-3">Cost</th>
              <th className="text-left px-4 py-3">Received</th>
              <th className="text-left px-4 py-3">Expires</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-500">No inventory items</td></tr>
            ) : items.map((i: InvItem) => {
              const available = i.quantity - (i.quantity_reserved ?? 0)
              const isExpired = i.expiration_date && new Date(i.expiration_date) < new Date()
              return (
                <tr key={i.id} className={`border-b border-gray-700/50 ${isExpired ? 'bg-red-900/10' : ''}`}>
                  <td className="px-4 py-2.5 text-gray-50">{i.products?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs tabular-nums">{i.biotrack_barcode ?? i.barcode ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-300">{i.rooms?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-50 tabular-nums">{i.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{i.quantity_reserved ?? 0}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${available <= 0 ? 'text-red-400' : available <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>{available}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{i.cost_per_unit ? fmt(i.cost_per_unit) : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{i.received_at ? new Date(i.received_at).toLocaleDateString() : '—'}</td>
                  <td className={`px-4 py-2.5 text-xs ${isExpired ? 'text-red-400 font-medium' : 'text-gray-400'}`}>{i.expiration_date ? new Date(i.expiration_date).toLocaleDateString() : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <span className="text-xs text-gray-400">{total} items</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-xs text-gray-400">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <p className="text-xs text-gray-400 uppercase">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${color ?? 'text-gray-50'}`}>{value}</p>
    </div>
  )
}
