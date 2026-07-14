'use client'

import { useState, useEffect, useCallback } from 'react'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  parent_id: string | null
  master_category: string | null
  purchase_limit_category: string | null
  tax_category: string
  regulatory_category: string | null
  default_flower_equivalent: number | null
  available_for: string
  is_active: boolean
  parent?: { id: string; name: string; slug: string } | null
}

const TAX_CATEGORIES = ['Cannabis', 'Non-Cannabis']
const PURCHASE_LIMIT_CATEGORIES = ['Flower', 'Concentrates', 'Edibles']
const AVAILABLE_FOR_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'recreational', label: 'Recreational Only' },
  { value: 'medical', label: 'Medical Only' },
]

const REGULATORY_CATEGORIES = [
  'SMOKED CANNABIS (S) - Flowers & Buds',
  'SMOKED CANNABIS (S) - Hash & Keif',
  'VAPORIZED CANNABIS (V) - Oil',
  'EDIBLE CANNABIS (E) - Candies',
]

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const inputCls = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent'
const selectCls = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent'

export default function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [masterCategories, setMasterCategories] = useState<string[]>([])

  const [form, setForm] = useState({
    name: '', slug: '', description: '', master_category: '',
    tax_category: 'Cannabis', purchase_limit_category: '',
    available_for: 'all', regulatory_category: '', default_flower_equivalent: '',
    parent_id: '', sort_order: '', is_active: true,
  })

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/categories')
    if (res.ok) {
      const data = await res.json()
      const cats = data.categories ?? []
      setCategories(cats)
      const masters = [...new Set(cats.map((c: Category) => c.master_category).filter(Boolean))] as string[]
      setMasterCategories(masters)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void Promise.resolve().then(fetchCategories) }, [fetchCategories])

  const openNew = () => {
    setEditId(null)
    setForm({
      name: '', slug: '', description: '', master_category: '',
      tax_category: 'Cannabis', purchase_limit_category: '',
      available_for: 'all', regulatory_category: '', default_flower_equivalent: '',
      parent_id: '', sort_order: '', is_active: true,
    })
    setShowForm(true)
    setError('')
  }

  const openEdit = (cat: Category) => {
    setEditId(cat.id)
    setForm({
      name: cat.name, slug: cat.slug, description: cat.description ?? '',
      master_category: cat.master_category ?? '',
      tax_category: cat.tax_category, purchase_limit_category: cat.purchase_limit_category ?? '',
      available_for: cat.available_for, regulatory_category: cat.regulatory_category ?? '',
      default_flower_equivalent: cat.default_flower_equivalent != null ? String(cat.default_flower_equivalent) : '',
      parent_id: cat.parent_id ?? '', sort_order: String(cat.sort_order),
      is_active: cat.is_active,
    })
    setShowForm(true)
    setError('')
  }

  const handleNameChange = (name: string) => {
    const autoSlug = !editId || form.slug === slugify(form.name)
    setForm(prev => ({
      ...prev, name,
      slug: autoSlug ? slugify(name) : prev.slug,
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.tax_category) { setError('Tax category is required'); return }
    setSaving(true)
    setError('')

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug || slugify(form.name),
      description: form.description.trim() || null,
      master_category: form.master_category || null,
      tax_category: form.tax_category,
      purchase_limit_category: form.purchase_limit_category || null,
      available_for: form.available_for,
      regulatory_category: form.regulatory_category || null,
      default_flower_equivalent: form.default_flower_equivalent ? parseFloat(form.default_flower_equivalent) : null,
      parent_id: form.parent_id || null,
      is_active: form.is_active,
    }
    if (form.sort_order) body.sort_order = parseInt(form.sort_order, 10)

    const url = editId ? `/api/categories/${editId}` : '/api/categories'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    if (res.ok) { setShowForm(false); fetchCategories() }
    else { const d = await res.json(); setError(d.error ?? 'Failed to save') }
    setSaving(false)
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this category? Products using it will need to be reassigned.')) return
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (res.ok) { fetchCategories() }
    else { const d = await res.json(); alert(d.error ?? 'Failed to deactivate') }
  }

  const filtered = search
    ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.master_category?.toLowerCase().includes(search.toLowerCase()))
    : categories

  const availableForLabel = (v: string) => AVAILABLE_FOR_OPTIONS.find(o => o.value === v)?.label ?? v

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-primary">Product Categories</h2>
        <button onClick={openNew} className="text-sm px-3 py-1.5 bg-accent text-primary rounded-lg hover:bg-accent">+ New Category</button>
      </div>

      <div className="mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="w-full max-w-sm h-10 px-3 bg-surface border border-edge rounded-lg text-primary text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-bg/60 z-50 flex items-center justify-center">
          <div className="bg-surface border border-edge rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-primary">{editId ? 'Edit' : 'New'} Category</h2>

            <label className="block">
              <span className="text-xs text-secondary">Name *</span>
              <input value={form.name} onChange={e => handleNameChange(e.target.value)} className={inputCls} />
            </label>

            <label className="block">
              <span className="text-xs text-secondary">Slug</span>
              <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} className={inputCls} />
            </label>

            <label className="block">
              <span className="text-xs text-secondary">Description</span>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputCls + ' h-auto py-2'} />
            </label>

            <label className="block">
              <span className="text-xs text-secondary">Master Category</span>
              <input
                list="master-categories" value={form.master_category}
                onChange={e => setForm(p => ({ ...p, master_category: e.target.value }))}
                className={inputCls} placeholder="e.g. Flower, Edibles, Concentrates..."
              />
              <datalist id="master-categories">
                {masterCategories.map(mc => <option key={mc} value={mc} />)}
              </datalist>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-secondary">Tax Category *</span>
                <select value={form.tax_category} onChange={e => setForm(p => ({ ...p, tax_category: e.target.value }))} className={selectCls}>
                  {TAX_CATEGORIES.map(tc => <option key={tc} value={tc}>{tc}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-secondary">Purchase Limit Category</span>
                <select value={form.purchase_limit_category} onChange={e => setForm(p => ({ ...p, purchase_limit_category: e.target.value }))} className={selectCls}>
                  <option value="">None</option>
                  {PURCHASE_LIMIT_CATEGORIES.map(plc => <option key={plc} value={plc}>{plc}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-secondary">Available For *</span>
                <select value={form.available_for} onChange={e => setForm(p => ({ ...p, available_for: e.target.value }))} className={selectCls}>
                  {AVAILABLE_FOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-secondary">Sort Order</span>
                <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} className={inputCls} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-secondary">Regulatory Category</span>
                <select value={form.regulatory_category} onChange={e => setForm(p => ({ ...p, regulatory_category: e.target.value }))} className={selectCls}>
                  <option value="">None</option>
                  {REGULATORY_CATEGORIES.map(rc => <option key={rc} value={rc}>{rc}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-secondary">Default Flower Equivalent (g)</span>
                <input type="number" step="0.001" min="0" value={form.default_flower_equivalent} onChange={e => setForm(p => ({ ...p, default_flower_equivalent: e.target.value }))} className={inputCls} placeholder="0.000" />
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-secondary">Parent Category</span>
              <select value={form.parent_id} onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))} className={selectCls}>
                <option value="">None (top-level)</option>
                {categories.filter(c => c.id !== editId).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            {editId && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded border-edge-strong text-accent focus:ring-accent" />
                <span className="text-sm text-secondary">Active</span>
              </label>
            )}

            {error && <p className="text-danger text-sm">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-raised text-secondary rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-accent text-primary rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-secondary text-xs uppercase">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Master Category</th>
              <th className="text-left px-4 py-3">Tax</th>
              <th className="text-left px-4 py-3">Limit</th>
              <th className="text-left px-4 py-3">Available For</th>
              <th className="text-center px-4 py-3">Order</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted">{search ? 'No matching categories' : 'No categories found'}</td></tr>
            ) : filtered.map(cat => (
              <tr key={cat.id} className="border-b border-edge/50 hover:bg-raised">
                <td className="px-4 py-2.5">
                  <span className="text-primary">{cat.name}</span>
                  {cat.parent && <span className="text-muted text-xs ml-2">({cat.parent.name})</span>}
                </td>
                <td className="px-4 py-2.5 text-secondary">{cat.master_category ?? '\u2014'}</td>
                <td className="px-4 py-2.5 text-secondary">{cat.tax_category}</td>
                <td className="px-4 py-2.5 text-secondary">{cat.purchase_limit_category ?? '\u2014'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    cat.available_for === 'all' ? 'bg-raised text-secondary' :
                    cat.available_for === 'medical' ? 'bg-info/50 text-info' :
                    'bg-accent/50 text-accent'
                  }`}>{availableForLabel(cat.available_for)}</span>
                </td>
                <td className="px-4 py-2.5 text-center text-secondary tabular-nums">{cat.sort_order}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => openEdit(cat)} className="text-xs text-secondary hover:text-accent mr-3">Edit</button>
                  <button onClick={() => handleDeactivate(cat.id)} className="text-xs text-secondary hover:text-danger">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
