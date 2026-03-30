'use client'

import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = any

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-600', confirmed: 'bg-blue-600', preparing: 'bg-purple-600', ready: 'bg-emerald-600',
}

const NEXT_STATUS: Record<string, string> = {
  pending: 'confirmed', confirmed: 'preparing', preparing: 'ready',
}

export default function OrderQueue({ locationId }: { locationId: string }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchOrders = () => {
    fetch(`/api/orders?location_id=${locationId}`)
      .then(r => r.json())
      .then(d => setOrders((d.orders ?? []).filter((o: Order) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status))))
  }

  useEffect(() => { fetchOrders(); const iv = setInterval(fetchOrders, 15000); return () => clearInterval(iv) }, [locationId])

  const advanceStatus = async (orderId: string, currentStatus: string) => {
    const next = NEXT_STATUS[currentStatus]
    if (!next) return
    await fetch(`/api/orders/${orderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) })
    fetchOrders()
  }

  const now = Date.now()

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">Online Orders ({orders.length})</h3>

      {orders.length === 0 ? (
        <p className="text-gray-500 text-sm">No active orders</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {orders.map((o: Order) => {
            const pickupMs = new Date(o.pickup_time).getTime() - now
            const urgency = pickupMs < 0 ? 'border-red-500' : pickupMs < 30 * 60000 ? 'border-yellow-500' : 'border-gray-700'
            const nextStatus = NEXT_STATUS[o.status]

            return (
              <div key={o.id} className={`border rounded-lg p-3 ${urgency}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${STATUS_COLORS[o.status] ?? 'bg-gray-600'}`}>
                      {o.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-50 font-medium">{o.customer_name}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(o.pickup_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{o.customer_phone}</p>
                {nextStatus && (
                  <button onClick={() => advanceStatus(o.id, o.status)}
                    className="mt-2 text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-500 transition-colors">
                    Mark {nextStatus}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
