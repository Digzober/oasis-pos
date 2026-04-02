'use client'

import { useState, useEffect } from 'react'

const FIELDS: Array<{ value: string; label: string }> = [
  { value: 'lifetime_spend', label: 'Lifetime Spend ($)' },
  { value: 'total_visits', label: 'Total Visits' },
  { value: 'last_visit_days_ago', label: 'Days Since Last Visit' },
  { value: 'customer_type', label: 'Customer Type' },
  { value: 'created_days_ago', label: 'Days Since Signup' },
  { value: 'avg_transaction_value', label: 'Avg Transaction Value ($)' },
]
const OPS: Array<{ value: string; label: string }> = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'does not equal' },
  { value: 'gt', label: 'is greater than' },
  { value: 'gte', label: 'is at least' },
  { value: 'lt', label: 'is less than' },
  { value: 'lte', label: 'is at most' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Seg = any

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Seg[]>([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [operator, setOperator] = useState<'AND' | 'OR'>('AND')
  const [conditions, setConditions] = useState<Array<{ field: string; op: string; value: string }>>([{ field: 'lifetime_spend', op: 'gte', value: '0' }])
  const [previewResult, setPreviewResult] = useState<{ count: number; sample: Seg[] } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch('/api/segments').then(r => r.json()).then(d => setSegments(d.segments ?? [])) }, [])

  const addCondition = () => setConditions(p => [...p, { field: 'lifetime_spend', op: 'gte', value: '0' }])
  const removeCondition = (i: number) => setConditions(p => p.filter((_, idx) => idx !== i))
  const updateCondition = (i: number, key: string, val: string) => setConditions(p => p.map((c, idx) => idx === i ? { ...c, [key]: val } : c))

  const preview = async () => {
    const rules = { operator, conditions: conditions.map(c => ({ ...c, value: isNaN(Number(c.value)) ? c.value : Number(c.value) })) }
    const res = await fetch('/api/segments/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules }) })
    if (res.ok) setPreviewResult(await res.json())
  }

  const save = async () => {
    setSaving(true)
    const rules = { operator, conditions: conditions.map(c => ({ ...c, value: isNaN(Number(c.value)) ? c.value : Number(c.value) })) }
    await fetch('/api/segments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description, rules }) })
    setShowBuilder(false); setName(''); setConditions([{ field: 'lifetime_spend', op: 'gte', value: '0' }]); setPreviewResult(null)
    fetch('/api/segments').then(r => r.json()).then(d => setSegments(d.segments ?? []))
    setSaving(false)
  }

  const inputCls = "h-9 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Customer Segments</h1>
        <button onClick={() => setShowBuilder(true)} className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">+ New Segment</button>
      </div>

      {showBuilder && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6 space-y-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Segment name" className={inputCls + ' w-full'} />
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className={inputCls + ' w-full'} />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Match</span>
            <select value={operator} onChange={e => setOperator(e.target.value as 'AND' | 'OR')} className={inputCls}>
              <option value="AND">ALL conditions (AND)</option><option value="OR">ANY condition (OR)</option>
            </select>
          </div>

          {conditions.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={c.field} onChange={e => updateCondition(i, 'field', e.target.value)} className={inputCls}>{FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
              <select value={c.op} onChange={e => updateCondition(i, 'op', e.target.value)} className={inputCls}>{OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              <input value={c.value} onChange={e => updateCondition(i, 'value', e.target.value)} className={inputCls + ' w-32'} />
              <button onClick={() => removeCondition(i)} className="text-red-400 text-xs">Remove</button>
            </div>
          ))}
          <button onClick={addCondition} className="text-xs text-emerald-400">+ Add Condition</button>

          <div className="flex gap-2">
            <button onClick={preview} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm">Preview</button>
            <button onClick={save} disabled={saving || !name} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Segment'}</button>
          </div>

          {previewResult && (
            <div className="bg-gray-900 rounded-lg p-3">
              <p className="text-sm text-gray-50 font-medium">{previewResult.count} customers match</p>
              {previewResult.sample.map((s: Seg) => <p key={s.id} className="text-xs text-gray-400">{s.name} — ${s.lifetime_spend}</p>)}
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Description</th><th className="text-left px-4 py-3">Rules</th>
          </tr></thead>
          <tbody>{segments.map((s: Seg) => (
            <tr key={s.id} className="border-b border-gray-700/50">
              <td className="px-4 py-2.5 text-gray-50">{s.name}</td>
              <td className="px-4 py-2.5 text-gray-400 text-xs">{s.description ?? '—'}</td>
              <td className="px-4 py-2.5 text-gray-400 text-xs">{JSON.stringify(s.rules).slice(0, 60)}...</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
