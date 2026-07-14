'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any

export default function ClosingReportPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [report, setReport] = useState<R>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ start_date: date, end_date: date })
    if (locationId) params.set('location_id', locationId)
    const res = await fetch(`/api/reports/closing?${params}`)
    if (res.ok) setReport(await res.json())
    setLoading(false)
  }, [locationId, date])

  useEffect(() => { if (hydrated) void Promise.resolve().then(fetchData) }, [hydrated, fetchData])

  const exportCsv = () => {
    if (!report) return
    const rows = [['Register', 'Opened By', 'Opened At', 'Closed At', 'Opening', 'Expected', 'Actual', 'Variance']]
    for (const reg of report.registers ?? []) {
      for (const d of reg.drawers ?? []) {
        rows.push([reg.register_name, d.opened_by, d.opened_at, d.closed_at ?? '', d.opening_amount, d.expected_cash, d.actual_cash ?? '', d.variance ?? ''])
      }
    }
    const csv = rows.map((r: unknown[]) => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = `closing-${date}.csv`; a.click()
  }

  const varianceColor = (v: number | null) => {
    if (v == null) return 'text-secondary'
    const abs = Math.abs(v)
    if (abs < 5) return 'text-accent'
    if (abs < 20) return 'text-warning'
    return 'text-danger'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Closing Report</h1>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 px-3 bg-surface border border-edge rounded-lg text-sm text-primary" />
          <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={showDetails} onChange={e => setShowDetails(e.target.checked)} className="rounded" /> Details</label>
          <button onClick={exportCsv} className="text-sm px-3 py-1.5 bg-raised text-secondary rounded-lg hover:bg-raised">Export CSV</button>
          <button onClick={() => window.print()} className="text-sm px-3 py-1.5 bg-raised text-secondary rounded-lg hover:bg-raised">Print</button>
        </div>
      </div>

      {loading ? <p className="text-muted">Loading...</p> : !report ? <p className="text-muted">No data</p> : (
        <div className="space-y-4">
          {(report.registers ?? []).map((reg: R) => (
            <div key={reg.register_name} className="bg-surface rounded-xl border border-edge p-4">
              <h3 className="text-primary font-semibold mb-3">{reg.register_name}</h3>
              {(reg.drawers ?? []).length === 0 ? (
                <p className="text-muted text-sm">No drawer sessions</p>
              ) : (
                <div className="space-y-3">
                  {(reg.drawers ?? []).map((d: R, i: number) => (
                    <div key={i} className="bg-bg rounded-lg p-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-secondary">Opened: </span><span className="text-secondary">{d.opened_by}</span></div>
                        <div><span className="text-secondary">At: </span><span className="text-secondary text-xs">{d.opened_at ? new Date(d.opened_at).toLocaleTimeString() : '—'}</span></div>
                        <div><span className="text-secondary">Closed: </span><span className="text-secondary">{d.closed_by ?? 'Still open'}</span></div>
                        <div><span className="text-secondary">At: </span><span className="text-secondary text-xs">{d.closed_at ? new Date(d.closed_at).toLocaleTimeString() : '—'}</span></div>
                      </div>
                      {showDetails && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-2 pt-2 border-t border-edge">
                          <div><span className="text-secondary">Opening: </span><span className="text-primary tabular-nums">{fmt(d.opening_amount)}</span></div>
                          <div><span className="text-secondary">Expected: </span><span className="text-primary tabular-nums">{fmt(d.expected_cash)}</span></div>
                          <div><span className="text-secondary">Actual: </span><span className="text-primary tabular-nums">{d.actual_cash != null ? fmt(d.actual_cash) : '—'}</span></div>
                          <div><span className="text-secondary">Variance: </span><span className={`tabular-nums font-medium ${varianceColor(d.variance)}`}>{d.variance != null ? `${d.variance >= 0 ? '+' : ''}${fmt(d.variance)}` : '—'}</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
