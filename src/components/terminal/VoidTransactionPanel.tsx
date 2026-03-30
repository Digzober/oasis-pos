'use client'

import { useState, useCallback } from 'react'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

interface TxSummary {
  id: string
  transaction_number: number
  total: number
  status: string
  created_at: string
  employee_name: string
  item_count: number
}

export default function VoidTransactionPanel({ onClose }: { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [tx, setTx] = useState<TxSummary | null>(null)
  const [reason, setReason] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const search = useCallback(async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setError('')
    setTx(null)
    try {
      const res = await fetch(`/api/reports/transactions?date_from=${new Date().toISOString().slice(0, 10)}&date_to=${new Date().toISOString().slice(0, 10)}&per_page=50`)
      if (res.ok) {
        const data = await res.json()
        const match = (data.transactions ?? []).find((t: TxSummary) =>
          String(t.transaction_number) === searchQuery.trim() && t.status === 'completed'
        )
        if (match) setTx(match)
        else setError('No completed transaction found with that number today')
      }
    } catch { setError('Search failed') }
    setIsSearching(false)
  }, [searchQuery])

  const handleVoid = useCallback(async () => {
    if (!tx || !reason.trim()) return
    setIsProcessing(true)
    setError('')
    try {
      const res = await fetch(`/api/transactions/${tx.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ void_reason: reason }),
      })
      if (res.ok) { setSuccess(true) }
      else {
        const data = await res.json()
        setError(data.error ?? 'Void failed')
      }
    } catch { setError('Connection error') }
    setIsProcessing(false)
  }, [tx, reason])

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-white">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-50 mb-2">Transaction Voided</h2>
          <p className="text-gray-400 text-sm mb-4">#{tx?.transaction_number} — {fmt(tx?.total ?? 0)} reversed</p>
          <button onClick={onClose} className="w-full h-11 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-lg w-full shadow-2xl">
        <div className="px-6 pt-5 pb-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-red-400">Void Transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Transaction number..." className="flex-1 h-11 px-4 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            <button onClick={search} disabled={isSearching} className="h-11 px-4 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors">
              {isSearching ? '...' : 'Find'}
            </button>
          </div>

          {/* Transaction details */}
          {tx && (
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-50 font-bold">#{tx.transaction_number}</span>
                <span className="text-gray-50 font-bold tabular-nums">{fmt(tx.total)}</span>
              </div>
              <div className="text-xs text-gray-400 space-y-0.5">
                <p>{new Date(tx.created_at).toLocaleString()}</p>
                <p>{tx.employee_name} — {tx.item_count} items</p>
              </div>
            </div>
          )}

          {/* Reason */}
          {tx && (
            <div>
              <label className="text-sm text-gray-400 block mb-1">Void Reason *</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Customer changed mind" className="w-full h-11 px-4 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {tx && (
          <div className="px-6 py-4 border-t border-gray-700 flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors">Cancel</button>
            <button onClick={handleVoid} disabled={!reason.trim() || isProcessing}
              className="flex-1 h-11 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {isProcessing ? 'Voiding...' : 'Void Transaction'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
