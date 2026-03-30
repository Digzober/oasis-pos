'use client'
import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rate = any

export default function TaxRatesPage() {
  const [rates, setRates] = useState<Rate[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', rate_percent: '', is_excise: false, applies_to: 'both' })
  const [loading, setLoading] = useState(true)

  const fetchRates = () => { fetch('/api/tax-rates').then(r => r.json()).then(d => { setRates(d.tax_rates ?? []); setLoading(false) }) }
  useEffect(() => { fetchRates() }, [])

  const save = async () => {
    await fetch('/api/tax-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rate_percent: parseFloat(form.rate_percent), location_id: undefined }) })
    setShowForm(false); setForm({ name: '', rate_percent: '', is_excise: false, applies_to: 'both' }); fetchRates()
  }

  const deactivate = async (id: string) => { await fetch(`/api/tax-rates/${id}`, { method: 'DELETE' }); fetchRates() }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Tax Rates</h1>
        <button onClick={() => setShowForm(true)} className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">+ New Rate</button>
      </div>
      {showForm && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" className="h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm" />
            <input type="number" step="0.000001" value={form.rate_percent} onChange={e => setForm(p => ({ ...p, rate_percent: e.target.value }))} placeholder="Rate (e.g. 0.12)" className="h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.is_excise} onChange={e => setForm(p => ({ ...p, is_excise: e.target.checked }))} /> Excise Tax</label>
            <select value={form.applies_to} onChange={e => setForm(p => ({ ...p, applies_to: e.target.value }))} className="h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm">
              <option value="both">Both</option><option value="recreational">Recreational</option><option value="medical">Medical</option>
            </select>
          </div>
          <div className="flex gap-2"><button onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
            <button onClick={save} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm">Save</button></div>
        </div>
      )}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th><th className="text-right px-4 py-3">Rate</th><th className="text-center px-4 py-3">Excise</th><th className="text-center px-4 py-3">Applies To</th><th className="text-center px-4 py-3">Status</th><th className="text-right px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td></tr>
            : rates.map((r: Rate) => (
            <tr key={r.id} className="border-b border-gray-700/50">
              <td className="px-4 py-2.5 text-gray-50">{r.name}</td>
              <td className="px-4 py-2.5 text-right text-gray-50 tabular-nums">{(r.rate_percent * 100).toFixed(2)}%</td>
              <td className="px-4 py-2.5 text-center text-gray-400">{r.is_excise ? 'Yes' : 'No'}</td>
              <td className="px-4 py-2.5 text-center text-gray-400 capitalize">{r.applies_to}</td>
              <td className="px-4 py-2.5 text-center"><span className={r.is_active ? 'text-emerald-400' : 'text-red-400'}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
              <td className="px-4 py-2.5 text-right">{r.is_active && <button onClick={() => deactivate(r.id)} className="text-xs text-gray-400 hover:text-red-400">Deactivate</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
