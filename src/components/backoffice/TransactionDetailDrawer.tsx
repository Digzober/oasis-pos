'use client'

import { useState, useEffect } from 'react'
import type { TransactionDetail } from '@/lib/services/reportingService'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-600',
  voided: 'bg-red-600',
  returned: 'bg-amber-600',
}

export default function TransactionDetailDrawer({
  transactionId,
  onClose,
}: {
  transactionId: string
  onClose: () => void
}) {
  const [tx, setTx] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reports/transactions/${transactionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTx(d?.transaction ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [transactionId])

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[480px] max-w-full bg-gray-800 border-l border-gray-700 z-50 flex flex-col overflow-hidden">
        <div className="h-14 border-b border-gray-700 flex items-center justify-between px-4 shrink-0">
          <h2 className="text-gray-50 font-semibold">Transaction Detail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">✕</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
        ) : !tx ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg text-gray-50 font-bold">#{tx.transaction_number}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${STATUS_COLORS[tx.status] ?? 'bg-gray-600'}`}>
                  {tx.status.toUpperCase()}
                </span>
                {tx.is_medical && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">MED</span>}
                {tx.biotrack_synced ? (
                  <span className="text-[10px] text-emerald-400">BT ✓</span>
                ) : (
                  <span className="text-[10px] text-amber-400">BT pending</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                <span>Date: {new Date(tx.created_at).toLocaleString()}</span>
                <span>Location: {tx.location.name}</span>
                <span>Employee: {tx.employee.name}</span>
                <span>Register: {tx.register?.name ?? '—'}</span>
                {tx.customer && <span>Customer: {tx.customer.name}</span>}
              </div>
              {tx.void_reason && (
                <div className="mt-2 text-xs bg-red-900/30 text-red-300 rounded px-2 py-1">
                  Void reason: {tx.void_reason}
                  {tx.voided_by_name && <span className="text-gray-500"> by {tx.voided_by_name}</span>}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-xs text-gray-400 font-semibold uppercase mb-2">Items ({tx.lines.length})</h3>
              <div className="space-y-2">
                {tx.lines.map((line) => (
                  <div key={line.id} className="flex justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-50 truncate">{line.product_name}</p>
                      <p className="text-xs text-gray-500">
                        {line.quantity} × {fmt(line.unit_price)}
                        {line.discount_amount > 0 && <span className="text-emerald-400 ml-1">-{fmt(line.discount_amount)}</span>}
                      </p>
                    </div>
                    <span className="text-gray-50 tabular-nums shrink-0 ml-2">{fmt(line.line_total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payments */}
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-xs text-gray-400 font-semibold uppercase mb-2">Payments</h3>
              {tx.payments.map((pay) => (
                <div key={pay.id} className="flex justify-between text-sm py-0.5">
                  <span className="text-gray-300 capitalize">{pay.payment_method}</span>
                  <span className="text-gray-50 tabular-nums">{fmt(pay.amount)}</span>
                </div>
              ))}
            </div>

            {/* Taxes */}
            {tx.taxes.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-xs text-gray-400 font-semibold uppercase mb-2">Taxes</h3>
                {tx.taxes.map((t) => (
                  <div key={t.id} className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-300">
                      {t.tax_name} ({(t.tax_rate * 100).toFixed(2)}%)
                      {t.is_excise && <span className="text-xs text-gray-500 ml-1">excise</span>}
                    </span>
                    <span className="text-gray-50 tabular-nums">{fmt(t.tax_amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="px-4 py-3 border-b border-gray-700 space-y-1">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal</span><span className="tabular-nums">{fmt(tx.subtotal)}</span>
              </div>
              {tx.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Discounts</span><span className="tabular-nums">-{fmt(tx.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-400">
                <span>Tax</span><span className="tabular-nums">{fmt(tx.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-50 pt-1 border-t border-gray-700">
                <span>Total</span><span className="tabular-nums">{fmt(tx.total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
