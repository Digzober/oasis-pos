'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

interface PurchaseOrder {
  id: string
  po_number: string
  status: string
  vendor_name: string | null
  location_name: string | null
  created_by_name: string | null
  total_cost: number | null
  expected_delivery_date: string | null
  created_at: string | null
  line_count: number
}

interface Pagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-raised/20 text-secondary',
  submitted: 'bg-info/20 text-info',
  partial: 'bg-warning/20 text-warning',
  received: 'bg-accent/20 text-accent',
  cancelled: 'bg-danger/20 text-danger',
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const { locationId, hydrated } = useSelectedLocation()
  const [tab, setTab] = useState<'active' | 'received'>('active')
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, per_page: 50, total: 0, total_pages: 0 })
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      tab,
      page: String(pagination.page),
    })
    if (search) params.set('search', search)
    if (locationId) params.set('location_id', locationId)

    const res = await fetch(`/api/purchase-orders?${params}`)
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders ?? [])
      setPagination(data.pagination ?? { page: 1, per_page: 50, total: 0, total_pages: 0 })
    }
    setLoading(false)
  }, [tab, pagination.page, search, locationId])

  useEffect(() => { if (hydrated) void Promise.resolve().then(fetchOrders) }, [hydrated, fetchOrders])

  const handleSearch = () => {
    setSearch(searchInput)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const createPO = async () => {
    setCreating(true)
    const res = await fetch('/api/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/inventory/purchase-orders/${data.purchase_order.id}`)
    }
    setCreating(false)
  }

  const formatMoney = (val: number | null): string => {
    if (val === null || val === undefined) return '$0.00'
    return `$${Number(val).toFixed(2)}`
  }

  const formatDate = (val: string | null): string => {
    if (!val) return '\u2014'
    return new Date(val).toLocaleDateString()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Purchase Orders</h1>
        <button
          onClick={createPO}
          disabled={creating}
          className="px-4 py-2 bg-accent text-primary rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create PO'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => { setTab('active'); setPagination(prev => ({ ...prev, page: 1 })) }}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
            tab === 'active' ? 'bg-raised text-primary' : 'text-secondary hover:text-primary hover:bg-surface'
          }`}
        >
          Purchase Orders
        </button>
        <button
          onClick={() => { setTab('received'); setPagination(prev => ({ ...prev, page: 1 })) }}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
            tab === 'received' ? 'bg-raised text-primary' : 'text-secondary hover:text-primary hover:bg-surface'
          }`}
        >
          Received
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search by PO number or vendor name..."
            className="w-full bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 bg-raised text-secondary rounded-lg text-sm hover:bg-raised">
          Search
        </button>
        {search && (
          <button
            onClick={() => { setSearchInput(''); setSearch(''); setPagination(prev => ({ ...prev, page: 1 })) }}
            className="px-3 py-2 text-sm text-secondary hover:text-primary"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-secondary text-xs uppercase">
              <th className="text-left px-4 py-3">PO Number</th>
              <th className="text-left px-4 py-3">Vendor</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Items</th>
              <th className="text-right px-4 py-3">Total Cost</th>
              <th className="text-left px-4 py-3">Expected Delivery</th>
              <th className="text-left px-4 py-3">Created By</th>
              <th className="text-left px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted">No purchase orders found</td></tr>
            ) : orders.map(po => (
              <tr
                key={po.id}
                onClick={() => router.push(`/inventory/purchase-orders/${po.id}`)}
                className="border-b border-edge/50 hover:bg-raised/30 cursor-pointer"
              >
                <td className="px-4 py-2.5 text-primary font-medium">{po.po_number}</td>
                <td className="px-4 py-2.5 text-secondary">{po.vendor_name ?? '\u2014'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${STATUS_COLORS[po.status] ?? 'bg-raised text-secondary'}`}>
                    {po.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{po.line_count}</td>
                <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{formatMoney(po.total_cost)}</td>
                <td className="px-4 py-2.5 text-secondary text-xs">{formatDate(po.expected_delivery_date)}</td>
                <td className="px-4 py-2.5 text-secondary text-xs">{po.created_by_name ?? '\u2014'}</td>
                <td className="px-4 py-2.5 text-secondary text-xs">{formatDate(po.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
            <span className="text-xs text-secondary">{pagination.total} purchase orders</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page <= 1}
                className="px-2 py-1 text-xs bg-raised text-secondary rounded disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 py-1 text-xs text-secondary">{pagination.page} / {pagination.total_pages}</span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.total_pages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.total_pages}
                className="px-2 py-1 text-xs bg-raised text-secondary rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
