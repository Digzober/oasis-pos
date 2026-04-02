'use client'
import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S = any

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

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<S[]>([])
  useEffect(() => { fetch('/api/reports/schedules').then(r => r.json()).then(d => setSchedules(d.schedules ?? [])) }, [])

  const deactivate = async (id: string) => { await fetch(`/api/reports/schedules/${id}`, { method: 'DELETE' }); fetch('/api/reports/schedules').then(r => r.json()).then(d => setSchedules(d.schedules ?? [])) }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Scheduled Reports</h1>
        <button onClick={() => {
          const date = new Date().toISOString().slice(0, 10)
          exportCSV(
            ['Report Name', 'Frequency', 'Recipients', 'Last Sent', 'Next Scheduled', 'Status'],
            schedules.map((s: S) => [
              s.email_subject ?? '', s.frequency ?? '', s.recipients?.join('; ') ?? '',
              s.last_sent_at ? new Date(s.last_sent_at).toLocaleDateString() : '',
              s.next_run_at ? new Date(s.next_run_at).toLocaleDateString() : '',
              s.is_active ? 'Active' : 'Inactive'
            ]),
            `scheduled-reports-${date}.csv`
          )
        }} disabled={schedules.length === 0} className="px-4 py-2 text-sm bg-gray-700 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Export CSV
        </button>
      </div>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
          <th className="text-left px-4 py-3">Subject</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Frequency</th><th className="text-center px-4 py-3">Active</th><th className="text-right px-4 py-3">Actions</th>
        </tr></thead><tbody>{schedules.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">No schedules</td></tr>
          : schedules.map((s: S) => (
          <tr key={s.id} className="border-b border-gray-700/50">
            <td className="px-4 py-2.5 text-gray-50">{s.email_subject}</td><td className="px-4 py-2.5 text-gray-300">{s.report_type}</td>
            <td className="px-4 py-2.5 text-gray-400 capitalize">{s.frequency}</td>
            <td className="px-4 py-2.5 text-center"><span className={s.is_active ? 'text-emerald-400' : 'text-gray-500'}>{s.is_active ? 'Active' : 'Off'}</span></td>
            <td className="px-4 py-2.5 text-right">{s.is_active && <button onClick={() => deactivate(s.id)} className="text-xs text-gray-400 hover:text-red-400">Deactivate</button>}</td>
          </tr>
        ))}</tbody></table>
      </div>
    </div>
  )
}
