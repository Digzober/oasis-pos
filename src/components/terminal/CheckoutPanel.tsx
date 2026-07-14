'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
    } catch {
      setError('Connection error')
      setIsProcessing(false)
    }
  }, [items, customerId, customerType, locationId, registerId, cashDrawerId, tenderedAmount, manualDiscountIds, clearCart, onClose])

  // Success screen
  if (result) {
    return <SuccessScreen result={result} clearCart={clearCart} onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-bg border border-edge rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-edge flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Complete Sale</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface/5 flex items-center justify-center text-muted hover:text-secondary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Item count + customer */}
        <p className="text-sm text-muted px-6 pt-3">
          {items.length} item{items.length !== 1 ? 's' : ''}
          {customerId ? ' \u00b7 Customer attached' : ''}
        </p>

        {/* Total Due */}
      <div className="mx-6 mt-4 bg-bg rounded-xl p-6 text-center">
          <p className="text-xs text-muted uppercase tracking-widest font-mono">Total Due</p>
          <p className="text-5xl font-bold text-primary tabular-nums font-mono tracking-tight mt-1">
            {fmt(total)}
          </p>
        </div>

        {/* Cash Tendered */}
        <div className="mx-6 mt-5">
          <label className="block text-xs text-muted mb-1.5">Cash Tendered</label>
          <input
            type="number"
            step="0.01"
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
            autoFocus
            className="w-full h-16 text-3xl text-center bg-bg border-2 border-edge focus:border-accent rounded-xl font-mono tabular-nums text-primary outline-none transition-colors"
            placeholder="0.00"
          />
        </div>

        {/* Quick Amount Buttons */}
        <div className="px-6 mt-4 grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => handleQuick(amt)}
              className="h-11 rounded-lg bg-surface border border-edge/50 text-secondary text-sm font-medium hover:bg-raised hover:border-edge-strong transition-all"
            >
              ${amt}
            </button>
          ))}
          <button
            onClick={handleExact}
            className="col-span-2 h-11 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
          >
            Exact
          </button>
        </div>

        {/* Change Due */}
        {tenderedAmount > 0 && tenderedAmount >= total && (
          <div className="mx-6 mt-4 text-center">
            <p className="text-xs text-muted">Change Due</p>
            <p className="text-3xl font-bold text-accent font-mono tabular-nums mt-0.5">
              {fmt(changeDue)}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mx-6 mt-3 text-sm text-danger text-center">{error}</p>
        )}

        {/* Complete Button */}
        <div className="mx-6 mt-5 mb-6">
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className="w-full h-14 rounded-xl bg-accent text-primary text-lg font-bold hover:bg-accent disabled:opacity-20 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-accent/40"
          >
            {isProcessing ? 'Processing...' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Success Screen ─── */

function SuccessScreen({
  result,
  clearCart,
  onClose,
}: {
  result: { transactionNumber: number; changeDue: number }
  clearCart: () => void
  onClose: () => void
}) {
  const [countdown, setCountdown] = useState(5)
  const closedRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1 && !closedRef.current) {
          closedRef.current = true
          clearCart()
          onClose()
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [clearCart, onClose])

  const handleNewSale = () => {
    if (!closedRef.current) {
      closedRef.current = true
      clearCart()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-bg border border-edge rounded-2xl w-full max-w-lg shadow-2xl py-10 px-8 text-center">
        {/* Checkmark */}
        <svg
          className="w-16 h-16 text-accent mx-auto"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="32" cy="32" r="28" className="text-accent/20" />
          <path d="M20 33l8 8 16-16" />
        </svg>

        <p className="text-lg text-secondary font-medium mt-4">Sale Complete</p>
        <p className="text-sm text-muted font-mono mt-1">
          Transaction #{result.transactionNumber}
        </p>

        {/* Change Due */}
        {result.changeDue > 0 && (
          <div className="mt-6">
            <p className="text-xs text-muted uppercase tracking-widest">Change Due</p>
            <p className="text-5xl font-bold text-accent font-mono tabular-nums mt-1">
              {fmt(result.changeDue)}
            </p>
          </div>
        )}

        {/* New Sale */}
        <button
          onClick={handleNewSale}
          className="mt-8 h-12 w-full max-w-xs mx-auto rounded-xl bg-surface border border-edge text-primary font-medium hover:bg-raised transition-colors block"
        >
          New Sale
        </button>

        {/* Countdown */}
        <p className="text-xs text-muted mt-3">
          Auto-closing in {Math.max(countdown, 0)}s
        </p>
      </div>
    </div>
  )
}
