'use client'

import { useState, useEffect, useCallback } from 'react'

interface LookupItem {
  id: string
  name: string
  is_active: boolean
  [key: string]: unknown
}

interface LookupCrudPageProps {
  title: string
  apiPath: string
  entityKey: string
  extraFields?: Array<{ key: string; label: string; type?: string }>
}

export default function LookupCrudPage({ title, apiPath, entityKey, extraFields = [] }: LookupCrudPageProps) {
  const [items, setItems] = useState<LookupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({ name: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const res = await fetch(apiPath)
    if (res.ok) {
      const data = await res.json()
      setItems(data[entityKey] ?? [])
    }
    setLoading(false)
  }, [apiPath, entityKey])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openNew = () => {
    setEditId(null)
    setFormData({ name: '', ...Object.fromEntries(extraFields.map(f => [f.key, ''])) })
    setShowForm(true)
    setError('')
  }

  const openEdit = (item: LookupItem) => {
    setEditId(item.id)
    const data: Record<string, string> = { name: item.name }
    extraFields.forEach(f => { data[f.key] = String(item[f.key] ?? '') })
    setFormData(data)
    setShowForm(true)
    setError('')
  }

  const handleSave = async () => {
    if (!formData.name?.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const url = editId ? `${apiPath}/${editId}` : apiPath
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
    if (res.ok) { setShowForm(false); fetchItems() }
    else { const d = await res.json(); setError(d.error ?? 'Failed to save') }
    setSaving(false)
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this item?')) return
    await fetch(`${apiPath}/${id}`, { method: 'DELETE' })
    fetchItems()
  }

  const inputCls = "w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">{title}</h1>
        <button onClick={openNew} className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">+ New</button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-50">{editId ? 'Edit' : 'New'} {title.slice(0, -1)}</h2>
            <label className="block">
              <span className="text-xs text-gray-400">Name *</span>
              <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputCls} />
            </label>
            {extraFields.map(f => (
              <label key={f.key} className="block">
                <span className="text-xs text-gray-400">{f.label}</span>
                <input type={f.type ?? 'text'} value={formData[f.key] ?? ''} onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))} className={inputCls} />
              </label>
            ))}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Name</th>
              {extraFields.map(f => <th key={f.key} className="text-left px-4 py-3">{f.label}</th>)}
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2 + extraFields.length} className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={2 + extraFields.length} className="text-center py-8 text-gray-500">None found</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="border-b border-gray-700/50">
                <td className="px-4 py-2.5 text-gray-50">{item.name}</td>
                {extraFields.map(f => <td key={f.key} className="px-4 py-2.5 text-gray-400">{String(item[f.key] ?? '—')}</td>)}
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => openEdit(item)} className="text-xs text-gray-400 hover:text-emerald-400 mr-3">Edit</button>
                  <button onClick={() => handleDeactivate(item.id)} className="text-xs text-gray-400 hover:text-red-400">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
