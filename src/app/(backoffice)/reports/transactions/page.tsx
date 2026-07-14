'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'
import TransactionDetailDrawer from '@/components/backoffice/TransactionDetailDrawer'
import type { TransactionSummary } from '@/lib/services/reportingService'
import { DENSE_BESPOKE_TABLE_CLASS } from '@/lib/constants/tableDensity'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-accent',
  voided: 'text-danger',
  returned: 'text-warning',
}

export default function TransactionLogPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const today = new Date().toISOString().split('T')[0]!
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [txType, setTxType] = useState('')
  const [status, setStatus] = useState('')
  const [transactions, setTransactions] = useState<TransactionSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)

  const perPage = 50
  const totalPages = Math.ceil(totalCount / perPage)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      page: String(page),
      per_page: String(perPage),
    })
    if (locationId) params.set('location_id', locationId)
    if (txType) params.set('transaction_type', txType)
    if (status) params.set('status', status)

    try {
      const res = await fetch(`/api/reports/transactions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions ?? [])
        setTotalCount(data.total_count ?? 0)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [dateFrom, dateTo, txType, status, page, locationId])

  useEffect(() => { if (hydrated) void Promise.resolve().then(fetchData) }, [hydrated, fetchData])

  const exportCsv = () => {
    const headers = ['#', 'Date', 'Location', 'Employee', 'Customer', 'Type', 'Status', 'Items', 'Total']
    const rows = transactions.map((tx) => [
      tx.transaction_number,
      new Date(tx.created_at).toLocaleString(),
      tx.location_name,
      tx.employee_name,
      tx.customer_name ?? '',
      tx.transaction_type,
      tx.status,
      tx.item_count,
      tx.total.toFixed(2),
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${dateFrom}-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {selectedTxId && (
        <TransactionDetailDrawer transactionId={selectedTxId} onClose={() => setSelectedTxId(null)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Transaction Log</h1>
        <button onClick={exportCsv} className="text-sm px-3 py-1.5 bg-raised text-secondary rounded-lg hover:bg-raised transition-colors">
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary" />
        <select value={txType} onChange={(e) => { setTxType(e.target.value); setPage(1) }} className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary">
          <option value="">All Types</option>
          <option value="sale">Sales</option>
          <option value="return">Returns</option>
          <option value="void">Voids</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary">
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="voided">Voided</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <div className="overflow-x-auto">
          <table data-density="compact" className={`${DENSE_BESPOKE_TABLE_CLASS} w-full`}>
            <thead>
              <tr className="border-b border-edge text-secondary text-xs uppercase">
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">Employee</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Items</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">BT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-8 text-muted">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-muted">No transactions found for this period</td></tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTxId(tx.id)}
                    className="border-b border-edge/50 hover:bg-raised/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 text-primary tabular-nums">{tx.transaction_number}</td>
                    <td className="px-4 py-2.5 text-secondary text-xs">{new Date(tx.created_at).toLocaleTimeString()}</td>
                    <td className="px-4 py-2.5 text-secondary truncate max-w-[140px]">{tx.location_name}</td>
                    <td className="px-4 py-2.5 text-secondary">{tx.employee_name}</td>
                    <td className="px-4 py-2.5 text-secondary">{tx.customer_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-secondary capitalize">{tx.transaction_type}</td>
                    <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{tx.item_count}</td>
                    <td className="px-4 py-2.5 text-right text-primary font-medium tabular-nums">{fmt(tx.total)}</td>
                    <td className={`px-4 py-2.5 text-center text-xs font-medium capitalize ${STATUS_COLORS[tx.status] ?? 'text-secondary'}`}>{tx.status}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`w-2 h-2 inline-block rounded-full ${tx.biotrack_synced ? 'bg-accent' : 'bg-warning'}`} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
            <span className="text-xs text-secondary">{totalCount} transactions</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs bg-raised text-secondary rounded disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-xs text-secondary">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-xs bg-raised text-secondary rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
