'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

interface ReceiptLine {
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
  discount_amount: number
}

interface ReceiptDiscount { name: string; amount: number }
interface ReceiptTax { name: string; rate: number; amount: number }
interface ReceiptPayment { method: string; amount: number; change: number }

interface ReceiptData {
  transaction_id: string
  receipt_number: string
  date: string
  location_name: string
  employee_name: string
  customer_name: string | null
  lines: ReceiptLine[]
  discounts: ReceiptDiscount[]
  taxes: ReceiptTax[]
  payments: ReceiptPayment[]
  subtotal: number
  discount_total: number
  tax_total: number
  total: number
}

interface RecentTransaction {
  id: string
  receipt_number: string
  created_at: string
  total: number
  customer_name: string
}

interface Props {
  registerId: string
  locationId: string
  isOpen: boolean
  onClose: () => void
}

export default function ReceiptReprint({ registerId, isOpen, onClose }: Props) {
  const [view, setView] = useState<'list' | 'preview'>('list')
  const [recent, setRecent] = useState<RecentTransaction[]>([])
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchRecent = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/terminal/receipt/recent?register_id=${registerId}`)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to load transactions')
        return
      }
      const d = await res.json()
      setRecent(d.transactions ?? [])
    } catch {
      setError('Network error loading transactions')
    } finally {
      setLoading(false)
    }
  }, [registerId])

  useEffect(() => {
    if (isOpen) {
      setView('list')
      setReceipt(null)
      setError('')
      fetchRecent()
    }
  }, [isOpen, fetchRecent])

  const fetchReceipt = async (txnId: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/terminal/receipt/${txnId}`)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to load receipt')
        return
      }
      const d = await res.json()
      setReceipt(d.receipt)
      setView('preview')
    } catch {
      setError('Network error loading receipt')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const printArea = document.getElementById('receipt-print-area')
    if (!printArea) return
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) return
    printWindow.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; margin: 0; color: #000; background: #fff; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
      </style></head><body>
      ${printArea.innerHTML}
      </body></html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  const handleEmailStub = () => {
    logger.info('Email receipt stub triggered', {
      transactionId: receipt?.transaction_id,
    })
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-gray-50">
              {view === 'list' ? 'Reprint Receipt' : 'Receipt Preview'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-50 hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 px-3 py-2 bg-red-900/30 border border-red-700/40 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-gray-400">Loading...</span>
              </div>
            )}

            {/* Transaction List */}
            {!loading && view === 'list' && (
              <>
                {recent.length === 0 && !error && (
                  <p className="text-center text-gray-500 py-8 text-sm">
                    No recent transactions for this register.
                  </p>
                )}
                <div className="space-y-2">
                  {recent.map((txn) => (
                    <button
                      key={txn.id}
                      onClick={() => fetchReceipt(txn.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl hover:border-emerald-600/50 hover:bg-gray-800/80 transition-all group text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-50">
                            #{txn.receipt_number}
                          </span>
                          <span className="text-xs text-gray-500">
                            {relativeTime(txn.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {txn.customer_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-400">
                          {fmt(txn.total)}
                        </span>
                        <svg className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Receipt Preview */}
            {!loading && view === 'preview' && receipt && (
              <>
                <div
                  id="receipt-print-area"
                  className="bg-gray-800 border border-gray-700 rounded-xl p-5 font-mono text-xs text-gray-200 leading-relaxed"
                >
                  {/* Store Header */}
                  <div className="center text-center mb-3">
                    <p className="bold font-bold text-sm text-gray-50">
                      OASIS CANNABIS CO.
                    </p>
                    <p className="text-gray-400">{receipt.location_name}</p>
                    <div className="divider border-t border-dashed border-gray-600 my-2" />
                    <p className="text-gray-400">
                      {new Date(receipt.date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                    <p className="text-gray-400">Receipt #{receipt.receipt_number}</p>
                    <p className="text-gray-400">Served by: {receipt.employee_name}</p>
                    {receipt.customer_name && (
                      <p className="text-gray-400">Customer: {receipt.customer_name}</p>
                    )}
                  </div>

                  <div className="border-t border-dashed border-gray-600 my-2" />

                  {/* Line Items */}
                  <div className="space-y-1.5">
                    {receipt.lines.map((line, i) => (
                      <div key={i}>
                        <div className="row flex justify-between">
                          <span className="text-gray-100 flex-1 pr-2 truncate">
                            {line.product_name}
                          </span>
                          <span className="text-gray-100 tabular-nums">
                            {fmt(line.line_total)}
                          </span>
                        </div>
                        <div className="text-gray-500 pl-2">
                          {line.quantity} x {fmt(line.unit_price)}
                          {line.discount_amount > 0 && (
                            <span className="text-emerald-500 ml-2">
                              -{fmt(line.discount_amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-gray-600 my-2" />

                  {/* Totals */}
                  <div className="space-y-1">
                    <div className="row flex justify-between text-gray-400">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{fmt(receipt.subtotal)}</span>
                    </div>
                    {receipt.discounts.map((d, i) => (
                      <div key={i} className="row flex justify-between text-emerald-400">
                        <span>{d.name}</span>
                        <span className="tabular-nums">-{fmt(d.amount)}</span>
                      </div>
                    ))}
                    {receipt.discount_total > 0 && (
                      <div className="row flex justify-between text-emerald-400">
                        <span>Discount Total</span>
                        <span className="tabular-nums">-{fmt(receipt.discount_total)}</span>
                      </div>
                    )}
                    {receipt.taxes.map((t, i) => (
                      <div key={i} className="row flex justify-between text-gray-400">
                        <span>{t.name} ({(t.rate * 100).toFixed(2)}%)</span>
                        <span className="tabular-nums">{fmt(t.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t border-dashed border-gray-600 my-1" />
                    <div className="total-row flex justify-between font-bold text-base text-gray-50">
                      <span>TOTAL</span>
                      <span className="tabular-nums">{fmt(receipt.total)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-600 my-2" />

                  {/* Payments */}
                  <div className="space-y-1">
                    {receipt.payments.map((p, i) => (
                      <div key={i}>
                        <div className="row flex justify-between text-gray-300">
                          <span className="capitalize">{p.method.replace(/_/g, ' ')}</span>
                          <span className="tabular-nums">{fmt(p.amount)}</span>
                        </div>
                        {p.change > 0 && (
                          <div className="row flex justify-between text-gray-500">
                            <span>Change</span>
                            <span className="tabular-nums">{fmt(p.change)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-gray-600 my-3" />
                  <p className="center text-center text-gray-500">
                    ** REPRINT **
                  </p>
                  <p className="center text-center text-gray-500 mt-1">
                    Thank you for choosing Oasis!
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => { setView('list'); setReceipt(null) }}
                    className="flex-1 h-11 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    Back to List
                  </button>
                  {receipt.customer_name && (
                    <button
                      onClick={handleEmailStub}
                      className="flex-1 h-11 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </button>
                  )}
                  <button
                    onClick={handlePrint}
                    className="flex-1 h-11 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
