'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }

export default function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter()
  const isEdit = !!productId

  const [form, setForm] = useState({
    name: '', slug: '', sku: '', barcode: '', description: '',
    categoryId: '', brandId: '', vendorId: '', strainId: '',
    recPrice: '', medPrice: '', costPrice: '',
    isCannabis: true, productType: 'quantity', defaultUnit: 'each',
    weightGrams: '', thcPercentage: '', cbdPercentage: '',
    thcContentMg: '', cbdContentMg: '', flowerEquivalent: '',
    strainType: '', onlineTitle: '', onlineDescription: '',
    regulatoryCategory: '',
  })

  const [categories, setCategories] = useState<AnyRecord[]>([])
  const [brands, setBrands] = useState<AnyRecord[]>([])
  const [vendors, setVendors] = useState<AnyRecord[]>([])
  const [strains, setStrains] = useState<AnyRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/brands').then(r => r.json()),
      fetch('/api/vendors').then(r => r.json()),
      fetch('/api/strains').then(r => r.json()),
    ]).then(([c, b, v, s]) => {
      setCategories(c.categories ?? [])
      setBrands(b.brands ?? [])
      setVendors(v.vendors ?? [])
      setStrains(s.strains ?? [])
    })
  }, [])

  useEffect(() => {
    if (!productId) return
    fetch(`/api/products/${productId}`)
      .then(r => r.json())
      .then(d => {
        const p = d.product
        if (!p) return
        setForm({
          name: p.name ?? '', slug: p.slug ?? '', sku: p.sku ?? '', barcode: p.barcode ?? '',
          description: p.description ?? '',
          categoryId: p.category_id ?? '', brandId: p.brand_id ?? '', vendorId: p.vendor_id ?? '', strainId: p.strain_id ?? '',
          recPrice: String(p.rec_price ?? ''), medPrice: String(p.med_price ?? ''), costPrice: String(p.cost_price ?? ''),
          isCannabis: p.is_cannabis ?? true, productType: p.product_type ?? 'quantity', defaultUnit: p.default_unit ?? 'each',
          weightGrams: String(p.weight_grams ?? ''), thcPercentage: String(p.thc_percentage ?? ''),
          cbdPercentage: String(p.cbd_percentage ?? ''),
          thcContentMg: String(p.thc_content_mg ?? ''), cbdContentMg: String(p.cbd_content_mg ?? ''),
          flowerEquivalent: String(p.flower_equivalent ?? ''), strainType: p.strain_type ?? '',
          onlineTitle: p.online_title ?? '', onlineDescription: p.online_description ?? '',
          regulatoryCategory: p.regulatory_category ?? '',
        })
      })
  }, [productId])

  const set = (field: string, value: string | boolean) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !isEdit) next.slug = slugify(value as string)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      name: form.name, slug: form.slug, sku: form.sku || undefined, barcode: form.barcode || null,
      description: form.description || null,
      categoryId: form.categoryId, brandId: form.brandId || null, vendorId: form.vendorId || null, strainId: form.strainId || null,
      recPrice: parseFloat(form.recPrice) || 0, medPrice: form.medPrice ? parseFloat(form.medPrice) : null,
      costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
      isCannabis: form.isCannabis, productType: form.productType, defaultUnit: form.defaultUnit,
      weightGrams: form.weightGrams ? parseFloat(form.weightGrams) : null,
      thcPercentage: form.thcPercentage ? parseFloat(form.thcPercentage) : null,
      cbdPercentage: form.cbdPercentage ? parseFloat(form.cbdPercentage) : null,
      thcContentMg: form.thcContentMg ? parseFloat(form.thcContentMg) : null,
      cbdContentMg: form.cbdContentMg ? parseFloat(form.cbdContentMg) : null,
      flowerEquivalent: form.flowerEquivalent ? parseFloat(form.flowerEquivalent) : null,
      strainType: form.strainType || null,
      onlineTitle: form.onlineTitle || null, onlineDescription: form.onlineDescription || null,
      regulatoryCategory: form.regulatoryCategory || null,
    }

    try {
      const url = isEdit ? `/api/products/${productId}` : '/api/products'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) { router.push('/products') }
      else { const d = await res.json(); setError(d.error ?? 'Failed to save') }
    } catch { setError('Connection error') }
    setSaving(false)
  }

  const handleDeactivate = async () => {
    if (!confirm('Deactivate this product? It will no longer appear in the POS.')) return
    const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' })
    if (res.ok) router.push('/products')
  }

  const inputCls = "w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  const selectCls = inputCls

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-50">{isEdit ? 'Edit Product' : 'New Product'}</h1>
        <div className="flex gap-2">
          {isEdit && <button type="button" onClick={handleDeactivate} className="text-sm px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">Deactivate</button>}
          <button type="button" onClick={() => router.push('/products')} className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Cancel</button>
          <button type="submit" disabled={saving} className="text-sm px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Basic Info */}
      <Section title="Basic Info">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name *"><input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} required /></Field>
          <Field label="Slug"><input value={form.slug} onChange={e => set('slug', e.target.value)} className={inputCls} /></Field>
          <Field label="SKU"><input value={form.sku} onChange={e => set('sku', e.target.value)} className={inputCls} placeholder="Auto-generated if blank" /></Field>
          <Field label="Barcode"><input value={form.barcode} onChange={e => set('barcode', e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Description"><textarea value={form.description} onChange={e => set('description', e.target.value)} className={inputCls + ' h-20'} /></Field>
      </Section>

      {/* Classification */}
      <Section title="Classification">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category *">
            <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className={selectCls} required>
              <option value="">Select...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Brand">
            <select value={form.brandId} onChange={e => set('brandId', e.target.value)} className={selectCls}>
              <option value="">None</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Vendor">
            <select value={form.vendorId} onChange={e => set('vendorId', e.target.value)} className={selectCls}>
              <option value="">None</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <Field label="Strain">
            <select value={form.strainId} onChange={e => set('strainId', e.target.value)} className={selectCls}>
              <option value="">None</option>
              {strains.map(s => <option key={s.id} value={s.id}>{s.name}{s.strain_type ? ` (${s.strain_type})` : ''}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={form.isCannabis} onChange={e => set('isCannabis', e.target.checked)} className="rounded" />
            Cannabis product
          </label>
          <Field label="Type">
            <select value={form.productType} onChange={e => set('productType', e.target.value)} className={selectCls + ' w-32'}>
              <option value="quantity">Quantity</option>
              <option value="weight">Weight</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Pricing */}
      <Section title="Pricing">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Rec Price *"><input type="number" step="0.01" value={form.recPrice} onChange={e => set('recPrice', e.target.value)} className={inputCls} required /></Field>
          <Field label="Med Price"><input type="number" step="0.01" value={form.medPrice} onChange={e => set('medPrice', e.target.value)} className={inputCls} /></Field>
          <Field label="Cost"><input type="number" step="0.01" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} className={inputCls} /></Field>
        </div>
      </Section>

      {/* Cannabis Details */}
      {form.isCannabis && (
        <Section title="Cannabis Details">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Weight (g)"><input type="number" step="0.001" value={form.weightGrams} onChange={e => set('weightGrams', e.target.value)} className={inputCls} /></Field>
            <Field label="THC %"><input type="number" step="0.01" value={form.thcPercentage} onChange={e => set('thcPercentage', e.target.value)} className={inputCls} /></Field>
            <Field label="CBD %"><input type="number" step="0.01" value={form.cbdPercentage} onChange={e => set('cbdPercentage', e.target.value)} className={inputCls} /></Field>
            <Field label="THC (mg)"><input type="number" step="0.01" value={form.thcContentMg} onChange={e => set('thcContentMg', e.target.value)} className={inputCls} /></Field>
            <Field label="CBD (mg)"><input type="number" step="0.01" value={form.cbdContentMg} onChange={e => set('cbdContentMg', e.target.value)} className={inputCls} /></Field>
            <Field label="Flower Equiv (g)"><input type="number" step="0.001" value={form.flowerEquivalent} onChange={e => set('flowerEquivalent', e.target.value)} className={inputCls} /></Field>
          </div>
        </Section>
      )}

      {/* Online */}
      <Section title="Ecommerce">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Online Title"><input value={form.onlineTitle} onChange={e => set('onlineTitle', e.target.value)} className={inputCls} /></Field>
          <Field label="Regulatory Category"><input value={form.regulatoryCategory} onChange={e => set('regulatoryCategory', e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Online Description"><textarea value={form.onlineDescription} onChange={e => set('onlineDescription', e.target.value)} className={inputCls + ' h-20'} /></Field>
      </Section>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-400 block mb-1">{label}</span>
      {children}
    </label>
  )
}
