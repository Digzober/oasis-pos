'use client'

import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export default function ManualReceiveForm({ onClose }: { onClose: () => void }) {
  const [productId, setProductId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [cost, setCost] = useState('')
  const [barcode, setBarcode] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [expiration, setExpiration] = useState('')
  const [notes, setNotes] = useState('')
  const [products, setProducts] = useState<AnyRecord[]>([])
  const [rooms, setRooms] = useState<AnyRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/products?limit=100').then(r => r.json()).then(d => setProducts(d.products ?? []))
    // Rooms would need a rooms API — use inventory check as proxy
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || !quantity) { setError('Product and quantity required'); return }
    setSaving(true); setError('')

    const res = await fetch('/api/inventory/receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        room_id: roomId || undefined,
        quantity: parseFloat(quantity),
        cost_per_unit: cost ? parseFloat(cost) : null,
        barcode: barcode || null,
        lot_number: lotNumber || null,
        expiration_date: expiration || null,
        notes: notes || null,
      }),
    })

    if (res.ok) { setSuccess(true) }
    else { const d = await res.json(); setError(d.error ?? 'Failed') }
    setSaving(false)
  }

  const inputCls = "w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full text-center">
          <p className="text-emerald-400 text-lg font-bold mb-2">Inventory Received</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-50">Manual Receive</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-200">✕</button>
        </div>

        <label className="block">
          <span className="text-xs text-gray-400">Product *</span>
          <select value={productId} onChange={e => setProductId(e.target.value)} className={inputCls} required>
            <option value="">Select product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-gray-400">Quantity *</span>
            <input type="number" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputCls} required />
          </label>
          <label className="block">
            <span className="text-xs text-gray-400">Cost per Unit</span>
            <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className={inputCls} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs text-gray-400">Barcode</span>
            <input value={barcode} onChange={e => setBarcode(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-400">Lot Number</span>
            <input value={lotNumber} onChange={e => setLotNumber(e.target.value)} className={inputCls} />
          </label>
        </div>

        <label className="block">
          <span className="text-xs text-gray-400">Expiration Date</span>
          <input type="date" value={expiration} onChange={e => setExpiration(e.target.value)} className={inputCls} />
        </label>

        <label className="block">
          <span className="text-xs text-gray-400">Notes</span>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className={inputCls + ' h-16'} />
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Receiving...' : 'Receive'}</button>
        </div>
      </form>
    </div>
  )
}
