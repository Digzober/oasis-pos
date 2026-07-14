'use client'

import { useState, useCallback } from 'react'
import type { TransactionDetail } from '@/lib/services/reportingService'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

interface ReturnLine {
  lineId: string
  productName: string
  originalQty: number
  returnQty: number
  unitRefund: number
  restoreToInventory: boolean
}

export default function ReturnPanel({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [tx, setTx] = useState<TransactionDetail | null>(null)
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([])
  const [reason, setReason] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ refundAmount: number; txNumber: number } | null>(null)

  const search = useCallback(async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setError('')
    setTx(null)
    setReturnLines([])

    try {
      // Search recent transactions
      const res = await fetch(`/api/reports/transactions?per_page=100&date_from=${new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)}&date_to=${new Date().toISOString().slice(0, 10)}`)
      if (!res.ok) { setError('Search failed'); setIsSearching(false); return }

      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = (data.transactions ?? []).find((t: any) => String(t.transaction_number) === searchQuery.trim() && t.status === 'completed')
      if (!match) { setError('No completed transaction found'); setIsSearching(false); return }

      // Load full detail
      const detailRes = await fetch(`/api/reports/transactions/${match.id}`)
      if (detailRes.ok) {
        const detail = await detailRes.json()
        setTx(detail.transaction)
        setReturnLines(detail.transaction.lines.map((line: TransactionDetail['lines'][number]) => ({
          lineId: line.id,
          productName: line.product_name,
          originalQty: line.quantity,
          returnQty: 0,
          unitRefund: Math.round((line.line_total / line.quantity) * 100) / 100,
          restoreToInventory: true,
        })))
      } else {
        setError('Failed to load transaction details')
      }
    } catch { setError('Search failed') }
    setIsSearching(false)
  }, [searchQuery])

  const updateReturnQty = (lineId: string, qty: number) => {
    setReturnLines((prev) => prev.map((l) =>
      l.lineId === lineId ? { ...l, returnQty: Math.max(0, Math.min(qty, l.originalQty)) } : l
    ))
  }

  const toggleRestore = (lineId: string) => {
    setReturnLines((prev) => prev.map((l) =>
      l.lineId === lineId ? { ...l, restoreToInventory: !l.restoreToInventory } : l
    ))
  }

  const selectedLines = returnLines.filter((l) => l.returnQty > 0)
  const refundTotal = selectedLines.reduce((s, l) => s + l.unitRefund * l.returnQty, 0)

  const handleReturn = async () => {
    if (!tx || selectedLines.length === 0 || !reason.trim()) return
    setIsProcessing(true)
    setError('')

    try {
      const res = await fetch(`/api/transactions/${tx.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_reason: reason,
          lines: selectedLines.map((l) => ({
            transaction_line_id: l.lineId,
            quantity: l.returnQty,
            restore_to_inventory: l.restoreToInventory,
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSuccess({ refundAmount: data.refundAmount, txNumber: data.transactionNumber })
      } else {
        const data = await res.json()
        setError(data.error ?? 'Return failed')
      }
    } catch { setError('Connection error') }
    setIsProcessing(false)
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-bg/80 z-50 flex items-center justify-center">
        <div className="bg-surface rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-warning rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-primary">↩</span>
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">Return Processed</h2>
          <p className="text-secondary text-sm mb-2">Return #{success.txNumber}</p>
          <p className="text-2xl font-bold text-warning tabular-nums mb-6">Refund: {fmt(success.refundAmount)}</p>
          <button onClick={onClose} className="w-full h-11 bg-raised text-secondary rounded-lg font-medium hover:bg-raised transition-colors">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-bg/80 z-50 flex items-center justify-center">
      <div className="bg-surface border border-edge rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh]">
        <div className="px-6 pt-5 pb-4 border-b border-edge flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-warning">Process Return</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary">✕</button>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Transaction number..." className="flex-1 h-11 px-4 bg-bg border border-edge-strong rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-warning" />
            <button onClick={search} disabled={isSearching} className="h-11 px-4 bg-raised text-secondary rounded-lg text-sm hover:bg-raised transition-colors">
              {isSearching ? '...' : 'Find'}
            </button>
          </div>

          {/* Line items */}
          {returnLines.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-secondary uppercase font-semibold">Select items to return</p>
              {returnLines.map((l) => (
                <div key={l.lineId} className="bg-bg rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-primary truncate">{l.productName}</span>
                    <span className="text-sm text-secondary tabular-nums">{fmt(l.unitRefund)}/ea</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-edge-strong rounded-lg">
                      <button onClick={() => updateReturnQty(l.lineId, l.returnQty - 1)}
                        className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-raised rounded-l-lg">−</button>
                      <span className="w-10 text-center text-sm text-primary tabular-nums">{l.returnQty}</span>
                      <button onClick={() => updateReturnQty(l.lineId, l.returnQty + 1)}
                        className="w-8 h-8 flex items-center justify-center text-secondary hover:bg-raised rounded-r-lg">+</button>
                    </div>
                    <span className="text-xs text-muted">of {l.originalQty}</span>
                    <label className="flex items-center gap-1.5 ml-auto text-xs text-secondary cursor-pointer">
                      <input type="checkbox" checked={l.restoreToInventory} onChange={() => toggleRestore(l.lineId)}
                        className="rounded border-edge-strong" />
                      Restock
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reason + refund */}
          {selectedLines.length > 0 && (
            <>
              <div>
                <label className="text-sm text-secondary block mb-1">Return Reason *</label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Defective product" className="w-full h-11 px-4 bg-bg border border-edge-strong rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-warning" />
              </div>
              <div className="bg-bg rounded-lg p-3 flex justify-between items-center">
                <span className="text-secondary text-sm">Refund Amount</span>
                <span className="text-xl font-bold text-warning tabular-nums">{fmt(refundTotal)}</span>
              </div>
            </>
          )}

          {error && <p className="text-danger text-sm">{error}</p>}
        </div>

        {selectedLines.length > 0 && (
          <div className="px-6 py-4 border-t border-edge flex gap-3 shrink-0">
            <button onClick={onClose} className="flex-1 h-11 bg-raised text-secondary rounded-lg font-medium hover:bg-raised transition-colors">Cancel</button>
            <button onClick={handleReturn} disabled={!reason.trim() || isProcessing}
              className="flex-1 h-11 bg-warning text-primary rounded-lg font-bold hover:bg-warning disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {isProcessing ? 'Processing...' : 'Process Return'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
