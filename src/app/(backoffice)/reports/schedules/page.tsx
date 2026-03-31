'use client'
import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S = any

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<S[]>([])
  useEffect(() => { fetch('/api/reports/schedules').then(r => r.json()).then(d => setSchedules(d.schedules ?? [])) }, [])

  const deactivate = async (id: string) => { await fetch(`/api/reports/schedules/${id}`, { method: 'DELETE' }); fetch('/api/reports/schedules').then(r => r.json()).then(d => setSchedules(d.schedules ?? [])) }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-50 mb-6">Scheduled Reports</h1>
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
