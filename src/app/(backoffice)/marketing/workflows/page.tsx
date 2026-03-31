'use client'
import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type W = any

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<W[]>([])
  useEffect(() => { fetch('/api/workflows').then(r => r.json()).then(d => setWorkflows(d.workflows ?? [])) }, [])

  const toggle = async (id: string, status: string) => {
    await fetch(`/api/workflows/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: status === 'active' ? 'pause' : 'activate' }) })
    fetch('/api/workflows').then(r => r.json()).then(d => setWorkflows(d.workflows ?? []))
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-50 mb-6">Workflows</h1>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Trigger</th><th className="text-center px-4 py-3">Status</th><th className="text-right px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>{workflows.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-500">No workflows</td></tr>
            : workflows.map((w: W) => (
            <tr key={w.id} className="border-b border-gray-700/50">
              <td className="px-4 py-2.5 text-gray-50">{w.name}</td>
              <td className="px-4 py-2.5 text-gray-300 text-xs">{w.trigger_type}</td>
              <td className="px-4 py-2.5 text-center"><span className={`text-xs ${w.status === 'active' ? 'text-emerald-400' : 'text-gray-400'}`}>{w.status}</span></td>
              <td className="px-4 py-2.5 text-right"><button onClick={() => toggle(w.id, w.status)} className="text-xs text-emerald-400 hover:text-emerald-300">{w.status === 'active' ? 'Pause' : 'Activate'}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
