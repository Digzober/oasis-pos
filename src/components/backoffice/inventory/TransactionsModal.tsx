'use client'

import { useState, useEffect } from 'react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ItemTransaction {
  id: string
  created_at: string
  transaction_id: string
  transaction_number: string | null
  transaction_type: string
  quantity: number
  unit_price: number
  line_total: number
}

interface TransactionsModalProps {
  itemId: string
  onClose: () => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function typeBadge(type: string): { label: string; cls: string } {
  switch (type) {
    case 'sale':
      return { label: 'Sale', cls: 'bg-accent/50 text-accent border-accent' }
    case 'return':
      return { label: 'Return', cls: 'bg-warning/50 text-warning border-warning' }
    case 'void':
      return { label: 'Void', cls: 'bg-danger/50 text-danger border-danger' }
    case 'exchange':
      return { label: 'Exchange', cls: 'bg-info/50 text-info border-info' }
    default:
      return { label: type, cls: 'bg-raised/50 text-secondary border-edge-strong' }
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TransactionsModal({ itemId, onClose }: TransactionsModalProps) {
  const [transactions, setTransactions] = useState<ItemTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/inventory/items/${itemId}/transactions`)
      if (!res.ok) {
        setError('Failed to load transactions')
        setLoading(false)
        return
      }
      const data = await res.json()
      setTransactions(data.lines ?? [])
      setLoading(false)
    }
    load()
  }, [itemId])

  return (
    <>
      <div className="fixed inset-0 bg-bg/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-surface border border-edge rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-edge shrink-0">
            <h2 className="text-lg font-semibold text-primary">Transactions</h2>
            <button
              onClick={onClose}
              className="text-secondary hover:text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-edge border-t-emerald-400 rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-danger text-sm">{error}</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted text-sm">No transactions found for this item.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-edge text-secondary text-xs uppercase">
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-3 py-2">Transaction ID</th>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-right px-3 py-2">Qty</th>
                      <th className="text-right px-3 py-2">Unit Price</th>
                      <th className="text-right px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => {
                      const badge = typeBadge(tx.transaction_type)
                      return (
                        <tr key={tx.id} className="border-b border-edge/50 hover:bg-raised/20">
                          <td className="px-3 py-2 text-secondary whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-secondary text-xs tabular-nums whitespace-nowrap">
                            {tx.transaction_number ?? tx.transaction_id.slice(0, 8)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-primary tabular-nums">
                            {tx.quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-secondary tabular-nums">
                            {fmt(tx.unit_price)}
                          </td>
                          <td className="px-3 py-2 text-right text-primary font-medium tabular-nums">
                            {fmt(tx.line_total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
