'use client'

import { useState, useEffect, use } from 'react'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500' },
  confirmed: { label: 'Confirmed', color: 'bg-info' },
  preparing: { label: 'Preparing', color: 'bg-info' },
  ready: { label: 'Ready for Pickup', color: 'bg-accent' },
  completed: { label: 'Completed', color: 'bg-overlay' },
  cancelled: { label: 'Cancelled', color: 'bg-danger' },
  expired: { label: 'Expired', color: 'bg-overlay' },
}

export default function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const capability = () => window.location.hash.slice(1)
  const fetchOrder = () => fetch(`/api/orders/${id}`, {
    headers: { Authorization: `Bearer ${capability()}` },
  }).then(r => r.json()).then(d => { setOrder(d.order); setLoading(false) })

  useEffect(() => { const load = () => fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${window.location.hash.slice(1)}` } }).then(r => r.json()).then(d => { setOrder(d.order); setLoading(false) }); void load(); const iv = setInterval(load, 30000); return () => clearInterval(iv) }, [id])

  const cancelOrder = async () => {
    if (!confirm('Cancel this order?')) return
    await fetch(`/api/orders/${id}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${capability()}` } })
    fetchOrder()
  }

  if (loading) return <div className="max-w-lg mx-auto px-4 py-12 text-center text-muted">Loading...</div>
  if (!order) return <div className="max-w-lg mx-auto px-4 py-12 text-center text-muted">Order not found</div>

  const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-overlay' }
  const canCancel = order.status === 'pending' || order.status === 'confirmed'

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className={`inline-block px-3 py-1 rounded-full text-primary text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </div>
        <h1 className="text-2xl font-bold mt-3">Order Placed!</h1>
        <p className="text-muted text-sm mt-1">We&apos;ll have it ready for you</p>
      </div>

      <div className="border rounded-xl p-4 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">Pickup Time</span>
          <span className="font-medium">{new Date(order.pickup_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">Name</span>
          <span>{order.customer_name}</span>
        </div>
        {order.locations && (
          <div className="text-sm text-muted mt-2 pt-2 border-t">
            <p className="font-medium text-muted">{order.locations.name}</p>
            <p>{order.locations.address_line1}, {order.locations.city} {order.locations.state} {order.locations.zip}</p>
            {order.locations.phone && <p>{order.locations.phone}</p>}
          </div>
        )}
      </div>

      <div className="border rounded-xl p-4 mb-4">
        <h3 className="font-medium mb-2">Items</h3>
        {(order.online_order_lines ?? []).map((line: { id: string; product_name: string; quantity: number; unit_price: number }) => (
          <div key={line.id} className="flex justify-between text-sm py-1">
            <span>{line.product_name} x{line.quantity}</span>
            <span className="tabular-nums">{fmt(line.unit_price * line.quantity)}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 flex justify-between font-bold">
          <span>Estimated Total</span>
          <span className="tabular-nums">{fmt(order.estimated_total)}</span>
        </div>
      </div>

      {canCancel && (
        <button onClick={cancelOrder} className="w-full py-2 border border-danger text-danger rounded-lg text-sm hover:bg-danger-soft transition-colors">
          Cancel Order
        </button>
      )}

      <p className="text-xs text-secondary text-center mt-4">Status refreshes automatically every 30 seconds</p>
    </div>
  )
}
