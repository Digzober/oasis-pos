'use client'

import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Report = any
const STATUS_COLORS: Record<string, string> = { matched: 'text-emerald-400', discrepancy: 'text-amber-400', local_only: 'text-red-400', biotrack_only: 'text-blue-400' }

export default function ReconciliationPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Report | null>(null)
  const [running, setRunning] = useState(false)
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([])
  const [locationId, setLocationId] = useState('')

  useEffect(() => { fetch('/api/auth/locations').then(r => r.json()).then(d => setLocations(d.locations ?? [])) }, [])
  useEffect(() => {
    const params = locationId ? `?location_id=${locationId}` : ''
    fetch(`/api/reconciliation${params}`).then(r => r.json()).then(d => setReports(d.reports ?? []))
  }, [locationId])

  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    fetch(`/api/reconciliation/${selectedId}`).then(r => r.json()).then(d => setDetail(d.report))
  }, [selectedId])

  const runNow = async () => {
    if (!locationId) return
    setRunning(true)
    await fetch('/api/reconciliation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location_id: locationId }) })
    setRunning(false)
    fetch(`/api/reconciliation?location_id=${locationId}`).then(r => r.json()).then(d => setReports(d.reports ?? []))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Inventory Reconciliation</h1>
        <div className="flex gap-2">
          <select value={locationId} onChange={e => setLocationId(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50">
            <option value="">All Locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
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
