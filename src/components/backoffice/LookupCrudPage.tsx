'use client'

import { useState, useEffect, useCallback } from 'react'

interface LookupItem {
  id: string
  name: string
  is_active: boolean
  [key: string]: unknown
}

interface FilterOption {
  value: string
  label: string
}

interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
}

interface LookupCrudPageProps {
  title: string
  apiPath: string
  entityKey: string
  extraFields?: Array<{ key: string; label: string; type?: string }>
  filters?: FilterConfig[]
}

const PAGE_SIZE_OPTIONS = [25, 50, 100]

export default function LookupCrudPage({
  title,
  apiPath,
  entityKey,
  extraFields = [],
  filters = [],
}: LookupCrudPageProps) {
  const [items, setItems] = useState<LookupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({ name: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [includeInactive, setIncludeInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    filters.forEach(f => { initial[f.key] = '' })
    return initial
  })

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (includeInactive) {
      params.set('includeInactive', 'true')
    }
    for (const [key, val] of Object.entries(filterValues)) {
      if (val) {
        params.set(key, val)
      }
    }
    const res = await fetch(`${apiPath}?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data[entityKey] ?? [])
      setTotal(data.total ?? 0)
    }
    setLoading(false)
  }, [apiPath, entityKey, page, limit, includeInactive, filterValues])

  useEffect(() => { void Promise.resolve().then(fetchItems) }, [fetchItems])

  useEffect(() => { void Promise.resolve().then(() => setPage(1)) }, [includeInactive, limit, filterValues])

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

  const handleReactivate = async (id: string) => {
    await fetch(`${apiPath}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
    })
    fetchItems()
  }

  const inputCls = "w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
  const selectCls = "h-8 px-2 bg-bg border border-edge-strong rounded-lg text-secondary text-xs focus:outline-none focus:ring-2 focus:ring-accent"

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-primary">{title}</h1>
        <button onClick={openNew} className="text-sm px-3 py-1.5 bg-accent text-primary rounded-lg hover:bg-accent">+ New</button>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={e => setIncludeInactive(e.target.checked)}
            className="w-4 h-4 rounded border-edge-strong bg-bg text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer"
          />
          Show inactive
        </label>
        {filters.map(f => (
          <label key={f.key} className="flex items-center gap-2 text-sm text-secondary">
            <span>{f.label}:</span>
            <select
              value={filterValues[f.key] ?? ''}
              onChange={e => setFilterValues(prev => ({ ...prev, [f.key]: e.target.value }))}
              className={selectCls}
            >
              <option value="">All</option>
              {f.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        ))}
        <div className="ml-auto flex items-center gap-2 text-sm text-secondary">
          <span>Per page:</span>
          <select value={limit} onChange={e => setLimit(Number(e.target.value))} className={selectCls}>
            {PAGE_SIZE_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-bg/60 z-50 flex items-center justify-center">
          <div className="bg-surface border border-edge rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-primary">{editId ? 'Edit' : 'New'} {title.slice(0, -1)}</h2>
            <label className="block">
              <span className="text-xs text-secondary">Name *</span>
              <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputCls} />
            </label>
            {extraFields.map(f => (
              <label key={f.key} className="block">
                <span className="text-xs text-secondary">{f.label}</span>
                {f.type === 'select' ? (
                  <select
                    value={formData[f.key] ?? ''}
                    onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">-- Select --</option>
                    {filters
                      .find(fl => fl.key === f.key)
                      ?.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    value={formData[f.key] ?? ''}
                    onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                    rows={3}
                    className={`${inputCls} h-auto py-2`}
                  />
                ) : (
                  <input
                    type={f.type ?? 'text'}
                    value={formData[f.key] ?? ''}
                    onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                    className={inputCls}
                  />
                )}
              </label>
            ))}
            {error && <p className="text-danger text-sm">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-raised text-secondary rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-accent text-primary rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-secondary text-xs uppercase">
              <th className="text-left px-4 py-3">Name</th>
              {extraFields.map(f => <th key={f.key} className="text-left px-4 py-3">{f.label}</th>)}
              {includeInactive && <th className="text-left px-4 py-3">Status</th>}
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2 + extraFields.length + (includeInactive ? 1 : 0)} className="text-center py-8 text-muted">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={2 + extraFields.length + (includeInactive ? 1 : 0)} className="text-center py-8 text-muted">None found</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className={`border-b border-edge/50 ${!item.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2.5 text-primary">{item.name}</td>
                {extraFields.map(f => <td key={f.key} className="px-4 py-2.5 text-secondary">{String(item[f.key] ?? '')}</td>)}
                {includeInactive && (
                  <td className="px-4 py-2.5">
                    {item.is_active ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/50 text-accent">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-danger/50 text-danger">Inactive</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => openEdit(item)} className="text-xs text-secondary hover:text-accent mr-3">Edit</button>
                  {item.is_active ? (
                    <button onClick={() => handleDeactivate(item.id)} className="text-xs text-secondary hover:text-danger">Remove</button>
                  ) : (
                    <button onClick={() => handleReactivate(item.id)} className="text-xs text-secondary hover:text-accent">Reactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-secondary">
        <span>
          {total} {total === 1 ? 'item' : 'items'} total
          {totalPages > 1 && ` \u2014 Page ${page} of ${totalPages}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 bg-raised text-secondary rounded-lg text-xs disabled:opacity-30 hover:bg-raised disabled:hover:bg-raised"
          >
            Prev
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 bg-raised text-secondary rounded-lg text-xs disabled:opacity-30 hover:bg-raised disabled:hover:bg-raised"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
