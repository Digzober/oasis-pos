'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Report = any
const STATUS_COLORS: Record<string, string> = { matched: 'text-emerald-400', discrepancy: 'text-amber-400', local_only: 'text-red-400', biotrack_only: 'text-blue-400' }

function exportCSV(headers: string[], rows: string[][], filename: string) {
  const escape = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
  const csv = [headers.join(','), ...rows.map(r => r.map(c => escape(String(c ?? ''))).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReconciliationPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [reports, setReports] = useState<Report[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Report | null>(null)
  const [running, setRunning] = useState(false)

  const fetchReports = useCallback(() => {
    fetch(`/api/reconciliation${locationId ? `?location_id=${locationId}` : ''}`).then(r => r.json()).then(d => setReports(d.reports ?? []))
  }, [locationId])
  useEffect(() => { if (hydrated) fetchReports() }, [hydrated, fetchReports])

  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    fetch(`/api/reconciliation/${selectedId}`).then(r => r.json()).then(d => setDetail(d.report))
  }, [selectedId])

  const runNow = async () => {
    if (!locationId) return
    setRunning(true)
    await fetch('/api/reconciliation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location_id: locationId }) })
    setRunning(false)
    fetchReports()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Inventory Reconciliation</h1>
        <div className="flex gap-2">
          <button onClick={() => {
            if (!detail) return
            const date = new Date().toISOString().slice(0, 10)
            exportCSV(
              ['Barcode', 'Product Name', 'Local Quantity', 'BioTrack Quantity', 'Variance', 'Status'],
              (detail.details ?? []).map((item: Report) => [
                item.biotrack_barcode ?? '', item.product_name ?? '',
                String(item.local_quantity ?? ''), String(item.biotrack_quantity ?? ''),
                String(item.variance ?? ''), item.status ?? ''
              ]),
              `reconciliation-${date}.csv`
            )
          }} disabled={!detail} className="px-4 py-2 text-sm bg-gray-700 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export CSV
          </button>
          <button onClick={runNow} disabled={running || !locationId} className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50">
            {running ? 'Running...' : 'Run Now'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Report list */}
        <div className="col-span-1 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 text-sm font-semibold text-gray-300">Reports</div>
          {reports.length === 0 ? <p className="p-4 text-gray-500 text-sm">No reports</p>
            : reports.map((r: Report) => (
            <button key={r.id} onClick={() => setSelectedId(r.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-700/50 text-sm hover:bg-gray-700/30 ${selectedId === r.id ? 'bg-gray-700' : ''}`}>
              <p className="text-gray-50">{new Date(r.run_at).toLocaleDateString()}</p>
              <p className="text-xs text-gray-400">
                {r.items_matched} matched · {r.items_with_discrepancy} discrepancies · {r.needs_review} review
              </p>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="col-span-2">
          {!detail ? <p className="text-gray-500 text-sm">Select a report to view details</p> : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <Card label="Matched" value={detail.items_matched} color="text-emerald-400" />
                <Card label="Discrepancies" value={detail.items_with_discrepancy} color="text-amber-400" />
                <Card label="Local Only" value={detail.items_local_only} color="text-red-400" />
                <Card label="BioTrack Only" value={detail.items_biotrack_only} color="text-blue-400" />
              </div>

              <div className="max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                    <th className="text-left py-2">Barcode</th><th className="text-left py-2">Product</th>
                    <th className="text-right py-2">Local</th><th className="text-right py-2">BioTrack</th>
                    <th className="text-right py-2">Variance</th><th className="text-center py-2">Status</th>
                  </tr></thead>
                  <tbody>{(detail.details ?? []).map((item: Report, i: number) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td className="py-1.5 text-gray-400 text-xs tabular-nums">{item.biotrack_barcode?.slice(0, 12)}</td>
                      <td className="py-1.5 text-gray-50 truncate max-w-[200px]">{item.product_name}</td>
                      <td className="py-1.5 text-right text-gray-300 tabular-nums">{item.local_quantity}</td>
                      <td className="py-1.5 text-right text-gray-300 tabular-nums">{item.biotrack_quantity}</td>
                      <td className={`py-1.5 text-right tabular-nums font-medium ${item.variance > 0 ? 'text-emerald-400' : item.variance < 0 ? 'text-red-400' : 'text-gray-400'}`}>{item.variance > 0 ? '+' : ''}{item.variance}</td>
                      <td className={`py-1.5 text-center text-xs capitalize ${STATUS_COLORS[item.status] ?? 'text-gray-400'}`}>{item.status}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-3 text-center">
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}
