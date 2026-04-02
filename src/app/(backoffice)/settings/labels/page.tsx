'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Template = any

const SAMPLE_DATA = {
  product_name: 'Blue Dream 3.5g', brand_name: 'Oasis', strain_name: 'Blue Dream', strain_type: 'hybrid',
  category_name: 'Flower', thc_percentage: '22.5%', cbd_percentage: '0.8%', weight: '3.5g',
  price: '$30.00', sku: 'PRD-00001', biotrack_barcode: '0123456789012345',
  batch_number: 'B-2026-001', lot_number: 'L-001', expiration_date: '06/30/2026',
  received_date: '03/30/2026', compliance_text: 'For use only by adults 21+. Keep out of reach of children. NM CCD Licensed.',
}

const DEFAULT_FIELDS = [
  { type: 'text', key: 'product_name', x: 2, y: 2, font_size: 11, bold: true },
  { type: 'text', key: 'brand_name', x: 2, y: 7, font_size: 8 },
  { type: 'text', key: 'thc_percentage', label: 'THC', x: 2, y: 12, font_size: 9 },
  { type: 'text', key: 'cbd_percentage', label: 'CBD', x: 20, y: 12, font_size: 9 },
  { type: 'text', key: 'weight', x: 2, y: 17, font_size: 9 },
  { type: 'text', key: 'price', x: 20, y: 17, font_size: 9, bold: true },
  { type: 'text', key: 'compliance_text', x: 2, y: 22, font_size: 5 },
]

export default function LabelsPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [templates, setTemplates] = useState<Template[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', label_type: 'product', width_mm: '50', height_mm: '25' })
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(() => { fetch(`/api/labels/templates${locationId ? `?location_id=${locationId}` : ''}`).then(r => r.json()).then(d => setTemplates(d.templates ?? [])) }, [locationId])
  useEffect(() => { if (hydrated) fetch_() }, [hydrated, fetch_])

  const save = async () => {
    setSaving(true)
    const body = { name: form.name, label_type: form.label_type, width_mm: parseFloat(form.width_mm), height_mm: parseFloat(form.height_mm), fields: DEFAULT_FIELDS }
    if (editId) {
      await fetch(`/api/labels/templates/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/labels/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false); setEditId(null); setForm({ name: '', label_type: 'product', width_mm: '50', height_mm: '25' }); fetch_()
  }

  const mmToPx = (mm: number) => Math.round(mm * 3.78)

  // Preview with sample data
  const previewW = mmToPx(parseFloat(form.width_mm) || 50)
  const previewH = mmToPx(parseFloat(form.height_mm) || 25)

  const inputCls = "w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Label Templates</h1>
        <button onClick={() => { setEditId(null); setForm({ name: '', label_type: 'product', width_mm: '50', height_mm: '25' }) }}
          className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">+ New Template</button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Template list + form */}
        <div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Size</th><th className="text-center px-4 py-3">Default</th>
              </tr></thead>
              <tbody>{templates.map((t: Template) => (
                <tr key={t.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer" onClick={() => { setEditId(t.id); setForm({ name: t.name, label_type: t.label_type, width_mm: String(t.width_mm), height_mm: String(t.height_mm) }) }}>
                  <td className="px-4 py-2.5 text-gray-50">{t.name}</td>
                  <td className="px-4 py-2.5 text-gray-300 capitalize">{t.label_type}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{t.width_mm}×{t.height_mm}mm</td>
                  <td className="px-4 py-2.5 text-center">{t.is_default ? <span className="text-emerald-400 text-xs">Default</span> : ''}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          {/* Form */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">{editId ? 'Edit' : 'New'} Template</h3>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Template name" className={inputCls} />
            <div className="grid grid-cols-3 gap-3">
              <select value={form.label_type} onChange={e => setForm(p => ({ ...p, label_type: e.target.value }))} className={inputCls}>
                <option value="product">Product</option><option value="shelf">Shelf</option><option value="bag">Bag</option><option value="custom">Custom</option>
              </select>
              <input value={form.width_mm} onChange={e => setForm(p => ({ ...p, width_mm: e.target.value }))} placeholder="Width mm" className={inputCls} />
              <input value={form.height_mm} onChange={e => setForm(p => ({ ...p, height_mm: e.target.value }))} placeholder="Height mm" className={inputCls} />
            </div>
            <button onClick={save} disabled={saving || !form.name} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>

        {/* Preview */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Preview</h3>
          <div className="bg-white rounded-lg p-4 inline-block">
            <div style={{ position: 'relative', width: previewW, height: previewH, border: '1px solid #ddd', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
              {DEFAULT_FIELDS.map((f, i) => {
                const val = SAMPLE_DATA[f.key as keyof typeof SAMPLE_DATA] ?? ''
                const prefix = f.label ? `${f.label}: ` : ''
                return <div key={i} style={{ position: 'absolute', left: mmToPx(f.x), top: mmToPx(f.y), fontSize: f.font_size, fontWeight: f.bold ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: previewW - mmToPx(f.x) - 4, color: '#000' }}>{prefix}{val}</div>
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
