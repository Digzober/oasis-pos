'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { SearchableSelect } from '@/components/shared'
import PackageHistoryModal from '@/components/backoffice/inventory/PackageHistoryModal'
import LabResultsModal from '@/components/backoffice/inventory/LabResultsModal'
import TransactionsModal from '@/components/backoffice/inventory/TransactionsModal'
import ItemDetailActions from '@/components/backoffice/inventory/ItemDetailActions'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LookupOption {
  id: string
  name: string
}

interface TagOption {
  id: string
  name: string
  color?: string | null
}

interface StatusOption {
  value: string
  label: string
}

interface InventoryItemDetail {
  id: string
  product_id: string | null
  location_id: string | null
  room_id: string | null
  subroom_id: string | null
  vendor_id: string | null
  producer_id: string | null
  biotrack_barcode: string | null
  barcode: string | null
  batch_id: string | null
  source_batch_id: string | null
  external_package_id: string | null
  quantity: number
  quantity_reserved: number
  cost_per_unit: number | null
  status: string | null
  packaging_date: string | null
  received_at: string | null
  expiration_date: string | null
  testing_status: string | null
  thc_percentage: number | null
  cbd_percentage: number | null
  weight_grams: number | null
  concentration: number | null
  flower_equivalent: number | null
  gross_weight: number | null
  available_for: string | null
  lab_test_results: Record<string, unknown> | null
  lab_test_date: string | null
  is_active: boolean
  products: {
    id: string
    name: string
    sku: string | null
    brands: { id: string; name: string } | null
    product_categories: { id: string; name: string } | null
  } | null
  rooms: { id: string; name: string } | null
  subrooms: { id: string; name: string } | null
  vendors: { id: string; name: string } | null
  tags: Array<{ id: string; name: string; color?: string | null }>
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed'
const selectCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'
const sectionCls = 'bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4'

/* ------------------------------------------------------------------ */
/*  Tag Multi-Select                                                   */
/* ------------------------------------------------------------------ */

function TagMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: TagOption[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${inputCls} text-left flex items-center justify-between`}
      >
        <span className={selected.length > 0 ? 'text-gray-50' : 'text-gray-500'}>
          {selected.length === 0
            ? 'Select tags...'
            : `${selected.length} tag${selected.length > 1 ? 's' : ''} selected`}
        </span>
        <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-700 border-b border-gray-700"
              >
                Clear all
              </button>
            )}
            {options.map(opt => (
              <label key={opt.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.id)}
                  onChange={() => toggle(opt.id)}
                  className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <span className="flex items-center gap-1.5 text-sm text-gray-200">
                  {opt.color && (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                  )}
                  {opt.name}
                </span>
              </label>
            ))}
            {options.length === 0 && (
              <p className="px-3 py-3 text-xs text-gray-500">No tags available</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function InventoryItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const itemId = params.id as string

  /* Data state */
  const [item, setItem] = useState<InventoryItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  /* Form state */
  const [packageId, setPackageId] = useState('')
  const [extPackageId, setExtPackageId] = useState('')
  const [batchName, setBatchName] = useState('')
  const [sourceBatch, setSourceBatch] = useState('')
  const [status, setStatus] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [subroomId, setSubroomId] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [producerId, setProducerId] = useState<string | null>(null)
  const [packagingDate, setPackagingDate] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [thcPercentage, setThcPercentage] = useState('')
  const [cbdPercentage, setCbdPercentage] = useState('')
  const [weightGrams, setWeightGrams] = useState('')
  const [concentration, setConcentration] = useState('')
  const [flowerEquivalent, setFlowerEquivalent] = useState('')
  const [grossWeight, setGrossWeight] = useState('')
  const [availableFor, setAvailableFor] = useState('')

  /* Lookups */
  const [vendors, setVendors] = useState<LookupOption[]>([])
  const [producers, setProducers] = useState<LookupOption[]>([])
  const [statuses, setStatuses] = useState<StatusOption[]>([])
  const [tags, setTags] = useState<TagOption[]>([])
  const [subrooms, setSubrooms] = useState<LookupOption[]>([])

  /* Modals */
  const [showHistory, setShowHistory] = useState(false)
  const [showLabResults, setShowLabResults] = useState(false)
  const [showTransactions, setShowTransactions] = useState(false)

  /* Fetch item data */
  const fetchItem = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/inventory/items/${itemId}`, { cache: 'no-store' })
    if (!res.ok) {
      setError('Failed to load inventory item')
      setLoading(false)
      return
    }
    const data = await res.json()
    const it: InventoryItemDetail = data.item ?? data
    setItem(it)
    populateForm(it)
    setLoading(false)
  }, [itemId])

  function populateForm(it: InventoryItemDetail) {
    setPackageId(it.biotrack_barcode ?? '')
    setExtPackageId(it.external_package_id ?? '')
    setBatchName(it.batch_id ?? '')
    setSourceBatch(it.source_batch_id ?? '')
    setStatus(it.status ?? '')
    setSelectedTagIds(it.tags?.map(t => t.id) ?? [])
    setSubroomId(it.subroom_id)
    setVendorId(it.vendor_id)
    setProducerId(it.producer_id)
    setPackagingDate(it.packaging_date ? it.packaging_date.slice(0, 10) : '')
    setExpirationDate(it.expiration_date ? it.expiration_date.slice(0, 10) : '')
    setThcPercentage(it.thc_percentage != null ? String(it.thc_percentage) : '')
    setCbdPercentage(it.cbd_percentage != null ? String(it.cbd_percentage) : '')
    setWeightGrams(it.weight_grams != null ? String(it.weight_grams) : '')
    setConcentration(it.concentration != null ? String(it.concentration) : '')
    setFlowerEquivalent(it.flower_equivalent != null ? String(it.flower_equivalent) : '')
    setGrossWeight(it.gross_weight != null ? String(it.gross_weight) : '')
    const af = it.available_for
    if (Array.isArray(af)) {
      setAvailableFor(af.length === 2 ? 'both' : af[0] ?? 'both')
    } else {
      setAvailableFor(af ?? 'both')
    }
  }

  /* Fetch lookups */
  useEffect(() => {
    fetchItem()
    const opts = { cache: 'no-store' as const }
    fetch('/api/vendors', opts).then(r => r.json()).then(d => setVendors(d.vendors ?? d.data ?? []))
    fetch('/api/vendors?type=producer', opts).then(r => r.json()).then(d => setProducers(d.vendors ?? d.data ?? []))
    fetch('/api/settings/inventory-statuses', opts).then(r => r.json()).then(d => {
      const list = d.statuses ?? d.data ?? []
      setStatuses(list.map((s: string | { value: string; label: string }) =>
        typeof s === 'string' ? { value: s, label: s } : s
      ))
    })
    fetch('/api/tags?type=inventory', opts).then(r => r.json()).then(d => setTags(d.tags ?? d.data ?? []))
    fetch('/api/subrooms', opts).then(r => r.json()).then(d => setSubrooms(d.subrooms ?? d.data ?? []))
  }, [fetchItem])

  /* Save handler */
  async function handleSave() {
    setSaving(true)
    setSaveSuccess(false)
    setError(null)
    const body = {
      biotrack_barcode: packageId || null,
      external_package_id: extPackageId || null,
      batch_id: batchName || null,
      source_batch_id: sourceBatch || null,
      status: status || null,
      tag_ids: selectedTagIds,
      subroom_id: subroomId,
      vendor_id: vendorId,
      producer_id: producerId,
      packaging_date: packagingDate || null,
      expiration_date: expirationDate || null,
      thc_percentage: thcPercentage ? parseFloat(thcPercentage) : null,
      cbd_percentage: cbdPercentage ? parseFloat(cbdPercentage) : null,
      weight_grams: weightGrams ? parseFloat(weightGrams) : null,
      concentration: concentration ? parseFloat(concentration) : null,
      flower_equivalent: flowerEquivalent ? parseFloat(flowerEquivalent) : null,
      gross_weight: grossWeight ? parseFloat(grossWeight) : null,
      available_for: availableFor || null,
    }
    const res = await fetch(`/api/inventory/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setSaveSuccess(true)
      await fetchItem()
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      const err = await res.json().catch(() => null)
      setError(err?.error ?? 'Failed to save changes')
    }
    setSaving(false)
  }

  /* After action callback */
  function handleActionUpdate() {
    fetchItem()
  }

  /* Loading / Error states */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-gray-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !item) {
    return (
      <div className="text-center py-24">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => router.push('/inventory')} className="text-emerald-400 hover:text-emerald-300 text-sm">
          Back to Inventory
        </button>
      </div>
    )
  }

  if (!item) return null

  const productName = item.products?.name ?? 'Unknown Product'
  const brandName = item.products?.brands?.name ?? ''
  const sku = item.products?.sku ?? ''
  const categoryName = item.products?.product_categories?.name ?? ''
  const roomName = item.rooms?.name ?? ''
  const qtyAvailable = item.quantity - (item.quantity_reserved ?? 0)

  return (
    <div className="max-w-4xl">
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/inventory')}
          className="p-2 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-50 truncate">{productName}</h1>
          {brandName && <p className="text-sm text-gray-400">{brandName}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowHistory(true)}
            className="px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            History
          </button>
          <button
            onClick={() => setShowLabResults(true)}
            className="px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Lab Results
          </button>
          <ItemDetailActions
            itemId={itemId}
            item={item}
            onUpdate={handleActionUpdate}
          />
        </div>
      </div>

      {/* Success / Error banners */}
      {saveSuccess && (
        <div className="mb-4 px-4 py-3 bg-emerald-900/40 border border-emerald-700 rounded-lg text-sm text-emerald-300">
          Changes saved successfully.
        </div>
      )}
      {error && item && (
        <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Basic Information</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* SKU (read-only) */}
          <div>
            <label className={labelCls}>SKU</label>
            <input type="text" value={sku} disabled className={inputCls} />
          </div>

          {/* View catalog item */}
          <div>
            <label className={labelCls}>Catalog Item</label>
            {item.product_id ? (
              <Link
                href={`/products/${item.product_id}/edit`}
                className="inline-flex items-center gap-1 h-10 px-3 text-sm text-emerald-400 hover:text-emerald-300"
              >
                View catalog item
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            ) : (
              <span className="h-10 flex items-center text-sm text-gray-500">No linked product</span>
            )}
          </div>

          {/* Category (read-only) */}
          <div>
            <label className={labelCls}>Category</label>
            <input type="text" value={categoryName} disabled className={inputCls} />
          </div>

          {/* Package ID */}
          <div>
            <label className={labelCls}>Package ID</label>
            <input type="text" value={packageId} onChange={e => setPackageId(e.target.value)} className={inputCls} placeholder="BioTrack barcode" />
          </div>

          {/* Ext Package ID */}
          <div>
            <label className={labelCls}>External Package ID</label>
            <input type="text" value={extPackageId} onChange={e => setExtPackageId(e.target.value)} className={inputCls} placeholder="External reference" />
          </div>

          {/* Batch name */}
          <div>
            <label className={labelCls}>Batch Name</label>
            <input type="text" value={batchName} onChange={e => setBatchName(e.target.value)} className={inputCls} placeholder="Batch identifier" />
          </div>

          {/* Source batch */}
          <div>
            <label className={labelCls}>Source Batch</label>
            <input type="text" value={sourceBatch} onChange={e => setSourceBatch(e.target.value)} className={inputCls} placeholder="Source batch reference" />
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
              <option value="">Select status...</option>
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Tags</label>
            <TagMultiSelect options={tags} selected={selectedTagIds} onChange={setSelectedTagIds} />
          </div>

          {/* Qty available (read-only) */}
          <div>
            <label className={labelCls}>Qty Available</label>
            <input type="text" value={String(qtyAvailable)} disabled className={inputCls} />
          </div>

          {/* Qty reserved (read-only) */}
          <div>
            <label className={labelCls}>Qty Reserved</label>
            <input type="text" value={String(item.quantity_reserved ?? 0)} disabled className={inputCls} />
          </div>

          {/* Room (read-only) */}
          <div>
            <label className={labelCls}>Room</label>
            <input type="text" value={roomName} disabled className={inputCls} />
          </div>

          {/* Subroom */}
          <div>
            <label className={labelCls}>Subroom</label>
            <SearchableSelect
              options={subrooms.map(s => ({ value: s.id, label: s.name }))}
              value={subroomId}
              onChange={setSubroomId}
              placeholder="Select subroom..."
            />
          </div>

          {/* Vendor */}
          <div>
            <label className={labelCls}>Vendor</label>
            <SearchableSelect
              options={vendors.map(v => ({ value: v.id, label: v.name }))}
              value={vendorId}
              onChange={setVendorId}
              placeholder="Select vendor..."
            />
          </div>

          {/* Producer */}
          <div>
            <label className={labelCls}>Producer</label>
            <SearchableSelect
              options={producers.map(p => ({ value: p.id, label: p.name }))}
              value={producerId}
              onChange={setProducerId}
              placeholder="Select producer..."
            />
          </div>

          {/* Packaging date */}
          <div>
            <label className={labelCls}>Packaging Date</label>
            <input type="date" value={packagingDate} onChange={e => setPackagingDate(e.target.value)} className={inputCls} />
          </div>

          {/* Inventory date (read-only) */}
          <div>
            <label className={labelCls}>Inventory Date</label>
            <input
              type="text"
              value={item.received_at ? new Date(item.received_at).toLocaleDateString() : ''}
              disabled
              className={inputCls}
            />
          </div>

          {/* Expiration date */}
          <div>
            <label className={labelCls}>Expiration Date</label>
            <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className={inputCls} />
          </div>

          {/* Potency THC */}
          <div>
            <label className={labelCls}>THC %</label>
            <input
              type="number"
              step="0.01"
              value={thcPercentage}
              onChange={e => setThcPercentage(e.target.value)}
              className={inputCls}
              placeholder="0.00"
            />
          </div>

          {/* Potency CBD */}
          <div>
            <label className={labelCls}>CBD %</label>
            <input
              type="number"
              step="0.01"
              value={cbdPercentage}
              onChange={e => setCbdPercentage(e.target.value)}
              className={inputCls}
              placeholder="0.00"
            />
          </div>

          {/* Available for */}
          <div>
            <label className={labelCls}>Available For</label>
            <select value={availableFor} onChange={e => setAvailableFor(e.target.value)} className={selectCls}>
              <option value="both">Both (Rec + Med)</option>
              <option value="recreational">Recreational Only</option>
              <option value="medical">Medical Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Weights Section */}
      <div className={`${sectionCls} mt-6`}>
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Weights</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Grams / Concentration */}
          <div>
            <label className={labelCls}>Weight (grams)</label>
            <input
              type="number"
              step="0.001"
              value={weightGrams}
              onChange={e => setWeightGrams(e.target.value)}
              className={inputCls}
              placeholder="0.000"
            />
          </div>

          <div>
            <label className={labelCls}>Concentration</label>
            <input
              type="number"
              step="0.001"
              value={concentration}
              onChange={e => setConcentration(e.target.value)}
              className={inputCls}
              placeholder="0.000"
            />
          </div>

          {/* Flower equivalency */}
          <div>
            <label className={labelCls}>Flower Equivalency (g)</label>
            <input
              type="number"
              step="0.001"
              value={flowerEquivalent}
              onChange={e => setFlowerEquivalent(e.target.value)}
              className={inputCls}
              placeholder="0.000"
            />
          </div>

          {/* Gross weight */}
          <div>
            <label className={labelCls}>Gross Weight (g)</label>
            <input
              type="number"
              step="0.001"
              value={grossWeight}
              onChange={e => setGrossWeight(e.target.value)}
              className={inputCls}
              placeholder="0.000"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          onClick={() => router.push('/inventory')}
          className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Modals */}
      {showHistory && (
        <PackageHistoryModal itemId={itemId} onClose={() => setShowHistory(false)} />
      )}
      {showLabResults && (
        <LabResultsModal item={item} onClose={() => setShowLabResults(false)} />
      )}
      {showTransactions && (
        <TransactionsModal itemId={itemId} onClose={() => setShowTransactions(false)} />
      )}
    </div>
  )
}
