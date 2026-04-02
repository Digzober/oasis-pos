'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

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

  useEffect(() => { if (hydrated) fetchData() }, [hydrated, fetchData])

  const totalHours = entries.reduce((s: number, e: Entry) => s + (e.total_hours ?? 0), 0)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-50 mb-6">Time Clock</h1>

      <div className="flex gap-3 mb-4">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50" />
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-50">
          Total: <span className="font-bold tabular-nums">{totalHours.toFixed(2)} hrs</span>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left px-4 py-3">Employee</th>
            <th className="text-left px-4 py-3">Clock In</th>
            <th className="text-left px-4 py-3">Clock Out</th>
            <th className="text-right px-4 py-3">Hours</th>
            <th className="text-left px-4 py-3">Notes</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading...</td></tr>
            : entries.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">No entries</td></tr>
            : entries.map((e: Entry) => (
              <tr key={e.id} className="border-b border-gray-700/50">
                <td className="px-4 py-2.5 text-gray-50">{e.employees ? `${e.employees.first_name} ${e.employees.last_name}` : '—'}</td>
                <td className="px-4 py-2.5 text-gray-300 text-xs">{e.clock_in ? new Date(e.clock_in).toLocaleString() : '—'}</td>
                <td className="px-4 py-2.5 text-gray-300 text-xs">{e.clock_out ? new Date(e.clock_out).toLocaleString() : <span className="text-emerald-400">Active</span>}</td>
                <td className="px-4 py-2.5 text-right text-gray-50 tabular-nums">{e.total_hours ? `${e.total_hours}h` : '—'}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs truncate max-w-[200px]">{e.notes ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
