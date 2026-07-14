'use client'
import { useState, useEffect } from 'react'
import { DENSE_BESPOKE_TABLE_CLASS } from '@/lib/constants/tableDensity'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type E = any

export default function EventsPage() {
  const [events, setEvents] = useState<E[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '', image_url: '' })

  useEffect(() => { fetch('/api/events').then(r => r.json()).then(d => setEvents(d.events ?? [])) }, [])

  const save = async () => {
    await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setShowForm(false); setForm({ name: '', description: '', start_date: '', end_date: '', image_url: '' })
    fetch('/api/events').then(r => r.json()).then(d => setEvents(d.events ?? []))
  }

  const inputCls = "h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm w-full"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Events</h1>
        <button onClick={() => setShowForm(true)} className="text-sm px-3 py-1.5 bg-accent text-primary rounded-lg hover:bg-accent">+ New Event</button>
      </div>
      {showForm && (
        <div className="bg-surface rounded-xl border border-edge p-4 mb-4 space-y-3">
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Event name" className={inputCls} />
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" className={inputCls + ' h-16'} />
          <div className="grid grid-cols-2 gap-3">
            <input type="datetime-local" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className={inputCls} />
            <input type="datetime-local" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className={inputCls} />
          </div>
          <input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="Image/banner URL (optional)" className={inputCls} />
          <div className="flex gap-2"><button onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-raised text-secondary rounded-lg text-sm">Cancel</button>
            <button onClick={save} className="px-3 py-1.5 bg-accent text-primary rounded-lg text-sm">Save</button></div>
        </div>
      )}
      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <table data-density="compact" className={`${DENSE_BESPOKE_TABLE_CLASS} w-full`}>
          <thead><tr className="border-b border-edge text-secondary text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Date</th><th className="text-center px-4 py-3">Status</th>
          </tr></thead>
          <tbody>{events.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-muted">No events</td></tr>
            : events.map((e: E) => (
            <tr key={e.id} className="border-b border-edge/50">
              <td className="px-4 py-2.5 text-primary">{e.name}</td>
              <td className="px-4 py-2.5 text-secondary text-xs">{e.start_date ? new Date(e.start_date).toLocaleDateString() : '—'}</td>
              <td className="px-4 py-2.5 text-center capitalize text-secondary text-xs">{e.status}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
