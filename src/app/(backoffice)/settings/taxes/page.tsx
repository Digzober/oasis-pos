'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rate = any

export default function TaxRatesPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [rates, setRates] = useState<Rate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', rate_percent: '', is_excise: false, applies_to: 'both' })
  const [loading, setLoading] = useState(true)

  const fetchRates = useCallback(() => { fetch(`/api/tax-rates${locationId ? `?location_id=${locationId}` : ''}`).then(r => r.json()).then(d => { setRates(d.tax_rates ?? []); setLoading(false) }) }, [locationId])
  useEffect(() => { if (hydrated) fetchRates() }, [hydrated, fetchRates])

  const save = async () => {
    await fetch('/api/tax-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rate_percent: parseFloat(form.rate_percent), location_id: undefined }) })
    setShowForm(false); setForm({ name: '', rate_percent: '', is_excise: false, applies_to: 'both' }); fetchRates()
  }

  const deactivate = async (id: string) => { await fetch(`/api/tax-rates/${id}`, { method: 'DELETE' }); fetchRates() }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Tax Rates</h1>
        <button onClick={() => setShowForm(true)} className="text-sm px-3 py-1.5 bg-accent text-primary rounded-lg hover:bg-accent">+ New Rate</button>
      </div>
      {showForm && (
        <div className="bg-surface rounded-xl border border-edge p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" className="h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm" />
            <input type="number" step="0.000001" value={form.rate_percent} onChange={e => setForm(p => ({ ...p, rate_percent: e.target.value }))} placeholder="Rate (e.g. 0.12)" className="h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={form.is_excise} onChange={e => setForm(p => ({ ...p, is_excise: e.target.checked }))} /> Excise Tax</label>
            <select value={form.applies_to} onChange={e => setForm(p => ({ ...p, applies_to: e.target.value }))} className="h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm">
              <option value="both">Both</option><option value="recreational">Recreational</option><option value="medical">Medical</option>
            </select>
          </div>
          <div className="flex gap-2"><button onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-raised text-secondary rounded-lg text-sm">Cancel</button>
            <button onClick={save} className="px-3 py-1.5 bg-accent text-primary rounded-lg text-sm">Save</button></div>
        </div>
      )}
      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-edge text-secondary text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th><th className="text-right px-4 py-3">Rate</th><th className="text-center px-4 py-3">Excise</th><th className="text-center px-4 py-3">Applies To</th><th className="text-center px-4 py-3">Status</th><th className="text-right px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="text-center py-8 text-muted">Loading...</td></tr>
            : rates.map((r: Rate) => (
            <tr key={r.id} className="border-b border-edge/50">
              <td className="px-4 py-2.5 text-primary">{r.name}</td>
              <td className="px-4 py-2.5 text-right text-primary tabular-nums">{(r.rate_percent * 100).toFixed(2)}%</td>
              <td className="px-4 py-2.5 text-center text-secondary">{r.is_excise ? 'Yes' : 'No'}</td>
              <td className="px-4 py-2.5 text-center text-secondary capitalize">{r.applies_to}</td>
              <td className="px-4 py-2.5 text-center"><span className={r.is_active ? 'text-accent' : 'text-danger'}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
              <td className="px-4 py-2.5 text-right">{r.is_active && <button onClick={() => deactivate(r.id)} className="text-xs text-secondary hover:text-danger">Deactivate</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
