'use client'

import { useState, useEffect, useCallback } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any

const ACTION_TYPES = ['adjust', 'receive', 'manual_receive', 'room_move', 'void']

export default function InventoryJournalPage() {
  const [entries, setEntries] = useState<J[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [actionType, setActionType] = useState('')
  const [loading, setLoading] = useState(false)
  const perPage = 50

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), date_from: dateFrom, date_to: dateTo })
    if (actionType) params.set('event_type', actionType)
    const res = await fetch(`/api/inventory/journal?${params}`)
    if (res.ok) { const d = await res.json(); setEntries(d.entries ?? []); setTotal(d.total ?? 0) }
    setLoading(false)
  }, [page, dateFrom, dateTo, actionType])

  useEffect(() => { fetchData() }, [fetchData])

  const exportCsv = () => {
    const rows = [['Date', 'Action', 'Employee', 'Delta', 'Prev Qty', 'New Qty', 'Reason', 'Notes'],
      ...entries.map((e: J) => [new Date(e.timestamp).toLocaleString(), e.action, e.employee_name, e.delta, e.previous_quantity, e.new_quantity, e.reason, e.notes])]
    const csv = rows.map((r: unknown[]) => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = `inventory-journal-${dateFrom}.csv`; a.click()
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Inventory Journal</h1>
        <button onClick={exportCsv} className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Export CSV</button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50" />
        <select value={actionType} onChange={e => { setActionType(e.target.value); setPage(1) }} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50">
          <option value="">All Actions</option>
          {ACTION_TYPES.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left px-4 py-3">Date/Time</th><th className="text-left px-4 py-3">Action</th>
            <th className="text-left px-4 py-3">Employee</th><th className="text-right px-4 py-3">Change</th>
            <th className="text-right px-4 py-3">New Qty</th><th className="text-left px-4 py-3">Reason</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td></tr>
            : entries.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No journal entries</td></tr>
            : entries.map((e: J) => (
            <tr key={e.id} className="border-b border-gray-700/50">
              <td className="px-4 py-2.5 text-gray-300 text-xs">{new Date(e.timestamp).toLocaleString()}</td>
              <td className="px-4 py-2.5"><span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-700 text-gray-300 capitalize">{e.action?.replace('_', ' ')}</span></td>
              <td className="px-4 py-2.5 text-gray-300">{e.employee_name}</td>
              <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${e.delta > 0 ? 'text-emerald-400' : e.delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {e.delta != null ? (e.delta > 0 ? `+${e.delta}` : String(e.delta)) : '—'}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-300 tabular-nums">{e.new_quantity ?? '—'}</td>
              <td className="px-4 py-2.5 text-gray-400 text-xs truncate max-w-[200px]">{e.reason ?? e.notes ?? '—'}</td>
            </tr>
          ))}</tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <span className="text-xs text-gray-400">{total} entries</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40">Prev</button>
              <span className="px-2 py-1 text-xs text-gray-400">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
