'use client'

import { useState, useCallback } from 'react'
import { useCart } from '@/hooks/useCart'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

const QUICK_AMOUNTS = [1, 5, 10, 20, 50, 100]

interface CheckoutPanelProps {
  onClose: () => void
  cashDrawerId: string
}

export default function CheckoutPanel({ onClose, cashDrawerId }: CheckoutPanelProps) {
  const {
    items, customerId, customerType, subtotal, discountTotal, taxTotal, total, locationId, registerId,
    manualDiscountIds, clearCart,
  } = useCart()

  const [tendered, setTendered] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ transactionNumber: number; changeDue: number } | null>(null)
  const [error, setError] = useState('')

  const tenderedAmount = parseFloat(tendered) || 0
  const changeDue = Math.max(0, Math.round((tenderedAmount - total) * 100) / 100)
  const canComplete = tenderedAmount >= total && !isProcessing

  const handleExact = () => setTendered(total.toFixed(2))

  const handleQuick = (amount: number) => {
    const current = parseFloat(tendered) || 0
    setTendered((current + amount).toFixed(2))
  }

  const handleComplete = useCallback(async () => {
    setIsProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          register_id: registerId || undefined,
          cash_drawer_id: cashDrawerId,
          customer_id: customerId,
          is_medical: customerType === 'medical',
          items: items.map((i) => ({
            product_id: i.productId,
            inventory_item_id: i.inventoryItemId,
            quantity: i.quantity,
          })),
          amount_tendered: tenderedAmount,
          payment_method: 'cash',
          manual_discount_ids: manualDiscountIds,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Transaction failed')
        setIsProcessing(false)
        return
      }

      setResult({ transactionNumber: data.transactionNumber, changeDue: data.changeDue })

      // Auto-clear after 5 seconds
      setTimeout(() => {
        clearCart()
        onClose()
      }, 5000)
    } catch {
      setError('Connection error')
      setIsProcessing(false)
    }
  }, [items, customerId, customerType, locationId, registerId, cashDrawerId, tenderedAmount, manualDiscountIds, clearCart, onClose])

  // Success screen
  if (result) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-white">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-50 mb-2">Sale Complete</h2>
          <p className="text-gray-400 text-sm mb-6">Transaction #{result.transactionNumber}</p>

          {result.changeDue > 0 && (
            <div className="bg-gray-900 rounded-xl p-4 mb-6">
              <p className="text-gray-400 text-sm">Change Due</p>
              <p className="text-4xl font-bold text-emerald-400 tabular-nums">{fmt(result.changeDue)}</p>
            </div>
          )}

          <button
            onClick={() => { clearCart(); onClose() }}
            className="w-full h-12 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors"
          >
            New Sale
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-50">Checkout</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-lg">✕</button>
        </div>

        {/* Order Summary */}
        <div className="px-6 py-4 border-b border-gray-700 space-y-1">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal ({items.length} items)</span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-sm text-emerald-400">
              <span>Discounts</span>
              <span className="tabular-nums">-{fmt(discountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-400">
            <span>Tax</span>
            <span className="tabular-nums">{fmt(taxTotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-50 pt-2 border-t border-gray-700">
            <span>Total</span>
            <span className="tabular-nums">{fmt(total)}</span>
          </div>
        </div>

        {/* Tender Input */}
        <div className="px-6 py-4 flex-1">
          <label className="block text-sm text-gray-400 mb-2">Cash Tendered</label>
          <input
            type="number"
            step="0.01"
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
            autoFocus
            className="w-full h-14 text-2xl text-center bg-gray-900 border border-gray-600 rounded-xl text-gray-50 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0.00"
          />

          <div className="grid grid-cols-4 gap-2 mt-3">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => handleQuick(amt)}
                className="h-10 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
              >
                +${amt}
              </button>
            ))}
            <button
              onClick={handleExact}
              className="h-10 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors col-span-2"
            >
              Exact
            </button>
          </div>

          {tenderedAmount > 0 && tenderedAmount >= total && (
            <div className="mt-3 text-center">
              <span className="text-gray-400 text-sm">Change: </span>
              <span className="text-emerald-400 text-lg font-bold tabular-nums">{fmt(changeDue)}</span>
            </div>
          )}

          {error && <p className="mt-3 text-red-400 text-sm text-center">{error}</p>}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className="flex-1 h-12 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  )
}
