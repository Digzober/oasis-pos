'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'
import { DENSE_BESPOKE_TABLE_CLASS } from '@/lib/constants/tableDensity'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Entry = any

export default function TimeClockPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [entries, setEntries] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo })
    if (locationId) params.set('location_id', locationId)
    const res = await fetch(`/api/time-clock?${params}`)
    if (res.ok) { const d = await res.json(); setEntries(d.entries ?? []); setTotal(d.total ?? 0) }
    setLoading(false)
  }, [dateFrom, dateTo, locationId])

  useEffect(() => { if (hydrated) void Promise.resolve().then(fetchData) }, [hydrated, fetchData])

  const totalHours = entries.reduce((s: number, e: Entry) => s + (e.total_hours ?? 0), 0)

  return (
    <div>
      <h1 className="text-xl font-bold text-primary mb-6">Time Clock</h1>

      <div className="flex gap-3 mb-4">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary" />
        <div className="bg-surface border border-edge rounded-lg px-4 py-2 text-sm text-primary">
          Total: <span className="font-bold tabular-nums">{totalHours.toFixed(2)} hrs</span>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <table data-density="compact" className={`${DENSE_BESPOKE_TABLE_CLASS} w-full`}>
          <thead><tr className="border-b border-edge text-secondary text-xs uppercase">
            <th className="text-left px-4 py-3">Employee</th>
            <th className="text-left px-4 py-3">Clock In</th>
            <th className="text-left px-4 py-3">Clock Out</th>
            <th className="text-right px-4 py-3">Hours</th>
            <th className="text-left px-4 py-3">Notes</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="text-center py-8 text-muted">Loading...</td></tr>
            : entries.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted">No entries</td></tr>
            : entries.map((e: Entry) => (
              <tr key={e.id} className="border-b border-edge/50">
                <td className="px-4 py-2.5 text-primary">{e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : '—'}</td>
                <td className="px-4 py-2.5 text-secondary text-xs">{e.clock_in ? new Date(e.clock_in).toLocaleString() : '—'}</td>
                <td className="px-4 py-2.5 text-secondary text-xs">{e.clock_out ? new Date(e.clock_out).toLocaleString() : <span className="text-accent">Active</span>}</td>
                <td className="px-4 py-2.5 text-right text-primary tabular-nums">{e.total_hours ? `${e.total_hours}h` : '—'}</td>
                <td className="px-4 py-2.5 text-secondary text-xs truncate max-w-[200px]">{e.notes ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
