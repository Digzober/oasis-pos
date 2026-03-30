'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnlineCart } from '@/stores/onlineCartStore'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

function getPickupTimes() {
  const times: string[] = []
  const now = new Date()
  const start = new Date(now.getTime() + 30 * 60000)
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0)
  for (let i = 0; i < 16; i++) {
    const t = new Date(start.getTime() + i * 15 * 60000)
    if (t.getHours() >= 21) break
    times.push(t.toISOString())
  }
  return times
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, locationId, subtotal, estimatedTax, estimatedTotal, clear } = useOnlineCart()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const pickupTimes = getPickupTimes()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone || !pickupTime || items.length === 0) { setError('Please fill in all required fields'); return }
    setSubmitting(true); setError('')

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_id: locationId,
        customer_name: name,
        customer_phone: phone,
        customer_email: email || null,
        pickup_time: pickupTime,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        notes: notes || null,
        order_type: 'pickup',
      }),
    })

    if (res.ok) {
      const data = await res.json()
      clear()
      router.push(`/order/${data.order.id}`)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to place order')
    }
    setSubmitting(false)
  }

  const inputCls = "w-full h-11 px-4 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone *</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pickup Time *</label>
          <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className={inputCls} required>
            <option value="">Select a time...</option>
            {pickupTimes.map((t) => (
              <option key={t} value={t}>{new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls + ' h-20'} />
        </div>

        <div className="border-t pt-4 space-y-1 text-sm">
          <div className="flex justify-between"><span>{items.length} items</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
          <div className="flex justify-between text-gray-500"><span>Est. Tax</span><span className="tabular-nums">{fmt(estimatedTax)}</span></div>
          <div className="flex justify-between font-bold text-lg"><span>Est. Total</span><span className="tabular-nums">{fmt(estimatedTotal)}</span></div>
          <p className="text-xs text-gray-500 mt-1">Payment is collected at pickup. Final total may vary.</p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" disabled={submitting || items.length === 0}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors">
          {submitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </div>
  )
}
