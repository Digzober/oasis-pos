'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Report = any
const STATUS_COLORS: Record<string, string> = { matched: 'text-accent', discrepancy: 'text-warning', local_only: 'text-danger', biotrack_only: 'text-info' }

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
  useEffect(() => { if (hydrated) void Promise.resolve().then(fetchReports) }, [hydrated, fetchReports])

  useEffect(() => {
    void Promise.resolve().then(async () => {
      if (!selectedId) { setDetail(null); return }
      const response = await fetch(`/api/reconciliation/${selectedId}`)
      const data = await response.json()
      setDetail(data.report)
    })
  }, [selectedId])

  const runNow = async () => {
    if (!locationId) return
    setRunning(true)
    await fetch('/api/reconciliation/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location_id: locationId }) })
    setRunning(false)
    fetchReports()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Inventory Reconciliation</h1>
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
          }} disabled={!detail} className="px-4 py-2 text-sm bg-raised border border-edge-strong text-primary rounded-lg hover:bg-raised transition-colors flex items-center gap-2 disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export CSV
          </button>
          <button onClick={runNow} disabled={running || !locationId} className="text-sm px-3 py-1.5 bg-accent text-primary rounded-lg hover:bg-accent disabled:opacity-50">
            {running ? 'Running...' : 'Run Now'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Report list */}
        <div className="col-span-1 bg-surface rounded-xl border border-edge overflow-hidden">
          <div className="px-4 py-3 border-b border-edge text-sm font-semibold text-secondary">Reports</div>
          {reports.length === 0 ? <p className="p-4 text-muted text-sm">No reports</p>
            : reports.map((r: Report) => (
            <button key={r.id} onClick={() => setSelectedId(r.id)}
              className={`w-full text-left px-4 py-3 border-b border-edge/50 text-sm hover:bg-raised/30 ${selectedId === r.id ? 'bg-raised' : ''}`}>
              <p className="text-primary">{new Date(r.run_at).toLocaleDateString()}</p>
              <p className="text-xs text-secondary">
                {r.items_matched} matched · {r.items_with_discrepancy} discrepancies · {r.needs_review} review
              </p>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="col-span-2">
          {!detail ? <p className="text-muted text-sm">Select a report to view details</p> : (
            <div className="bg-surface rounded-xl border border-edge p-4">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <Card label="Matched" value={detail.items_matched} color="text-accent" />
                <Card label="Discrepancies" value={detail.items_with_discrepancy} color="text-warning" />
                <Card label="Local Only" value={detail.items_local_only} color="text-danger" />
                <Card label="BioTrack Only" value={detail.items_biotrack_only} color="text-info" />
              </div>

              <div className="max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-edge text-secondary text-xs uppercase">
                    <th className="text-left py-2">Barcode</th><th className="text-left py-2">Product</th>
                    <th className="text-right py-2">Local</th><th className="text-right py-2">BioTrack</th>
                    <th className="text-right py-2">Variance</th><th className="text-center py-2">Status</th>
                  </tr></thead>
                  <tbody>{(detail.details ?? []).map((item: Report, i: number) => (
                    <tr key={i} className="border-b border-edge/50">
                      <td className="py-1.5 text-secondary text-xs tabular-nums">{item.biotrack_barcode?.slice(0, 12)}</td>
                      <td className="py-1.5 text-primary truncate max-w-[200px]">{item.product_name}</td>
                      <td className="py-1.5 text-right text-secondary tabular-nums">{item.local_quantity}</td>
                      <td className="py-1.5 text-right text-secondary tabular-nums">{item.biotrack_quantity}</td>
                      <td className={`py-1.5 text-right tabular-nums font-medium ${item.variance > 0 ? 'text-accent' : item.variance < 0 ? 'text-danger' : 'text-secondary'}`}>{item.variance > 0 ? '+' : ''}{item.variance}</td>
                      <td className={`py-1.5 text-center text-xs capitalize ${STATUS_COLORS[item.status] ?? 'text-secondary'}`}>{item.status}</td>
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
    <div className="bg-bg rounded-lg p-3 text-center">
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-secondary">{label}</p>
    </div>
  )
}
