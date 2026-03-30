'use client'

import { useState, useCallback, useEffect } from 'react'
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
      } else {
        setError('Failed to load transaction details')
      }
    } catch { setError('Search failed') }
    setIsSearching(false)
  }, [searchQuery])

  useEffect(() => {
    if (!tx) return
    setReturnLines(tx.lines.map((l) => ({
      lineId: l.id,
      productName: l.product_name,
      originalQty: l.quantity,
      returnQty: 0,
      unitRefund: Math.round((l.line_total / l.quantity) * 100) / 100,
      restoreToInventory: true,
    })))
  }, [tx])

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

  const handleReturn = useCallback(async () => {
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
  }, [tx, selectedLines, reason])

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-white">↩</span>
          </div>
          <h2 className="text-xl font-bold text-gray-50 mb-2">Return Processed</h2>
          <p className="text-gray-400 text-sm mb-2">Return #{success.txNumber}</p>
          <p className="text-2xl font-bold text-amber-400 tabular-nums mb-6">Refund: {fmt(success.refundAmount)}</p>
          <button onClick={onClose} className="w-full h-11 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh]">
        <div className="px-6 pt-5 pb-4 border-b border-gray-700 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-amber-400">Process Return</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">✕</button>
        </div>

        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Transaction number..." className="flex-1 h-11 px-4 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <button onClick={search} disabled={isSearching} className="h-11 px-4 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors">
              {isSearching ? '...' : 'Find'}
            </button>
          </div>

          {/* Line items */}
          {returnLines.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 uppercase font-semibold">Select items to return</p>
              {returnLines.map((l) => (
                <div key={l.lineId} className="bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-50 truncate">{l.productName}</span>
                    <span className="text-sm text-gray-400 tabular-nums">{fmt(l.unitRefund)}/ea</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-600 rounded-lg">
                      <button onClick={() => updateReturnQty(l.lineId, l.returnQty - 1)}
                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-gray-700 rounded-l-lg">−</button>
                      <span className="w-10 text-center text-sm text-gray-50 tabular-nums">{l.returnQty}</span>
                      <button onClick={() => updateReturnQty(l.lineId, l.returnQty + 1)}
                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-gray-700 rounded-r-lg">+</button>
                    </div>
                    <span className="text-xs text-gray-500">of {l.originalQty}</span>
                    <label className="flex items-center gap-1.5 ml-auto text-xs text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={l.restoreToInventory} onChange={() => toggleRestore(l.lineId)}
                        className="rounded border-gray-600" />
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
                <label className="text-sm text-gray-400 block mb-1">Return Reason *</label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Defective product" className="w-full h-11 px-4 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="bg-gray-900 rounded-lg p-3 flex justify-between items-center">
                <span className="text-gray-400 text-sm">Refund Amount</span>
                <span className="text-xl font-bold text-amber-400 tabular-nums">{fmt(refundTotal)}</span>
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {selectedLines.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-700 flex gap-3 shrink-0">
            <button onClick={onClose} className="flex-1 h-11 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors">Cancel</button>
            <button onClick={handleReturn} disabled={!reason.trim() || isProcessing}
              className="flex-1 h-11 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {isProcessing ? 'Processing...' : 'Process Return'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
