'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = any

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-600', confirmed: 'bg-blue-600', ready: 'bg-emerald-600',
  completed: 'bg-gray-600', cancelled: 'bg-red-600', expired: 'bg-gray-700',
}

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

export default function OrdersPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (locationId) params.set('location_id', locationId)
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/orders?${params}`)
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders ?? [])
    }
    setLoading(false)
  }, [locationId, statusFilter])

  useEffect(() => { if (hydrated) fetchOrders() }, [hydrated, fetchOrders])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchOrders()
  }

  const filterCls = (s: string) => `px-3 py-1.5 text-xs rounded-lg transition-colors ${statusFilter === s ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Online Orders</h1>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setStatusFilter('')} className={filterCls('')}>All</button>
        <button onClick={() => setStatusFilter('pending')} className={filterCls('pending')}>Pending</button>
        <button onClick={() => setStatusFilter('confirmed')} className={filterCls('confirmed')}>Confirmed</button>
        <button onClick={() => setStatusFilter('ready')} className={filterCls('ready')}>Ready</button>
        <button onClick={() => setStatusFilter('completed')} className={filterCls('completed')}>Completed</button>
        <button onClick={() => setStatusFilter('cancelled')} className={filterCls('cancelled')}>Cancelled</button>
      </div>

      {/* Orders Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Order #</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Pickup Time</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">{statusFilter ? `No ${statusFilter} orders` : 'No online orders'}</td></tr>
            ) : orders.map((o: Order) => (
              <tr key={o.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-4 py-2.5 text-gray-50 font-mono text-xs">{o.order_number ?? o.id.slice(0, 8)}</td>
                <td className="px-4 py-2.5 text-gray-300">{o.customer_name}</td>
                <td className="px-4 py-2.5 text-gray-400 capitalize text-xs">{o.order_type ?? 'pickup'}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${STATUS_COLORS[o.status] ?? 'bg-gray-600'}`}>
                    {o.status?.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-gray-300 tabular-nums">{fmt(o.estimated_total ?? 0)}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{o.pickup_time ? new Date(o.pickup_time).toLocaleString() : '—'}</td>
                <td className="px-4 py-2.5 text-right">
                  {o.status === 'pending' && (
                    <button onClick={() => handleStatusChange(o.id, 'confirmed')} className="text-xs text-emerald-400 hover:text-emerald-300 mr-2">Confirm</button>
                  )}
                  {o.status === 'confirmed' && (
                    <button onClick={() => handleStatusChange(o.id, 'ready')} className="text-xs text-blue-400 hover:text-blue-300 mr-2">Mark Ready</button>
                  )}
                  {(o.status === 'pending' || o.status === 'confirmed') && (
                    <button onClick={() => handleStatusChange(o.id, 'cancelled')} className="text-xs text-red-400 hover:text-red-300">Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
