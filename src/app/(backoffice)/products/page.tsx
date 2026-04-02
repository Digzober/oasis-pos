'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProductImage {
  id: string
  image_url: string
  sort_order: number
  is_primary: boolean
}

interface Product {
  id: string
  name: string
  sku: string | null
  rec_price: number | null
  med_price: number | null
  cost_price: number | null
  is_active: boolean
  is_cannabis: boolean
  category: { id: string; name: string; master_category: string | null } | null
  brand: { id: string; name: string } | null
  vendor: { id: string; name: string } | null
  strain: { id: string; name: string; strain_type: string | null } | null
  images: ProductImage[]
  tags: Array<{ id: string; name: string; color: string | null }>
  inventoryAvailable: number
  skuCount: number
  online_title: string | null
  available_online?: boolean
}

interface LookupOption {
  id: string
  name: string
  color?: string | null
}

type SortField = 'name' | 'sku' | 'rec_price' | 'med_price' | 'cost_price' | 'available_qty'
type SortOrder = 'asc' | 'desc'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function getAvailableQty(p: Product): number {
  return p.inventoryAvailable ?? 0
}

function getPrimaryImage(p: Product): string | null {
  if (!p.images || p.images.length === 0) return null
  const primary = p.images.find(img => img.is_primary)
  return (primary ?? p.images[0])?.image_url ?? null
}

/* ------------------------------------------------------------------ */
/*  Skeleton Row                                                       */
/* ------------------------------------------------------------------ */

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-gray-700/50 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-700 rounded w-3/4" />
        </td>
      ))}
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/*  Sort Header                                                        */
/* ------------------------------------------------------------------ */

function SortHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
  align = 'left',
}: {
  label: string
  field: SortField
  currentSort: SortField
  currentOrder: SortOrder
  onSort: (f: SortField) => void
  align?: 'left' | 'right'
}) {
  const active = currentSort === field
  const arrow = active ? (currentOrder === 'asc' ? ' \u25B2' : ' \u25BC') : ''
  return (
    <th
      className={`${align === 'right' ? 'text-right' : 'text-left'} px-4 py-3 cursor-pointer select-none hover:text-gray-200 transition-colors ${active ? 'text-emerald-400' : ''}`}
      onClick={() => onSort(field)}
    >
      {label}{arrow}
    </th>
  )
}

/* ------------------------------------------------------------------ */
/*  Tag Pill                                                           */
/* ------------------------------------------------------------------ */

function TagPill({ name, color }: { name: string; color: string | null }) {
  const bg = color ?? '#4B5563'
  return (
    <span
      className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mr-1 mb-0.5 whitespace-nowrap"
      style={{ backgroundColor: bg, color: '#fff' }}
    >
      {name}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Multi-Select Tag Dropdown                                          */
/* ------------------------------------------------------------------ */

function TagMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: LookupOption[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 min-w-[140px] text-left flex items-center justify-between gap-2"
      >
        <span className="truncate">
          {selected.length === 0 ? 'All Tags' : `${selected.length} tag${selected.length > 1 ? 's' : ''}`}
        </span>
        <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-56 max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
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
            <p className="px-3 py-3 text-xs text-gray-500">No tags found</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Bulk Edit Panel — edit any product field                           */
/* ------------------------------------------------------------------ */

const BULK_EDIT_FIELDS: Array<{ key: string; label: string; type: 'text' | 'number' | 'select' | 'checkbox'; options?: Array<{ value: string; label: string }>; step?: string; group: string }> = [
  // Pricing
  { key: 'rec_price', label: 'Rec Price', type: 'number', step: '0.01', group: 'Pricing' },
  { key: 'med_price', label: 'Med Price', type: 'number', step: '0.01', group: 'Pricing' },
  { key: 'cost_price', label: 'Cost', type: 'number', step: '0.01', group: 'Pricing' },
  { key: 'sale_price', label: 'Sale Price', type: 'number', step: '0.01', group: 'Pricing' },
  { key: 'is_on_sale', label: 'On Sale', type: 'checkbox', group: 'Pricing' },
  // Classification
  { key: 'available_for', label: 'Available For', type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'recreational', label: 'Recreational' }, { value: 'medical', label: 'Medical' }], group: 'Classification' },
  { key: 'is_cannabis', label: 'Cannabis Product', type: 'checkbox', group: 'Classification' },
  { key: 'is_taxable', label: 'Taxable', type: 'checkbox', group: 'Classification' },
  { key: 'allow_automatic_discounts', label: 'Allow Auto Discounts', type: 'checkbox', group: 'Classification' },
  { key: 'available_online', label: 'Available Online', type: 'checkbox', group: 'Classification' },
  { key: 'available_on_pos', label: 'Available on POS', type: 'checkbox', group: 'Classification' },
  { key: 'product_type', label: 'Product Type', type: 'select', options: [{ value: 'quantity', label: 'Quantity' }, { value: 'weight', label: 'Weight' }], group: 'Classification' },
  // Details
  { key: 'producer', label: 'Producer', type: 'text', group: 'Details' },
  { key: 'size', label: 'Size', type: 'text', group: 'Details' },
  { key: 'flavor', label: 'Flavor', type: 'text', group: 'Details' },
  { key: 'alternate_name', label: 'Alternate Name', type: 'text', group: 'Details' },
  { key: 'description', label: 'Description', type: 'text', group: 'Details' },
  // Cannabis
  { key: 'thc_percentage', label: 'THC %', type: 'number', step: '0.01', group: 'Cannabis' },
  { key: 'cbd_percentage', label: 'CBD %', type: 'number', step: '0.01', group: 'Cannabis' },
  { key: 'weight_grams', label: 'Weight (g)', type: 'number', step: '0.001', group: 'Cannabis' },
  { key: 'flower_equivalent', label: 'Flower Equiv (g)', type: 'number', step: '0.001', group: 'Cannabis' },
  { key: 'dosage', label: 'Dosage', type: 'text', group: 'Cannabis' },
  { key: 'net_weight', label: 'Net Weight', type: 'number', step: '0.01', group: 'Cannabis' },
  { key: 'gross_weight_grams', label: 'Gross Weight (g)', type: 'number', step: '0.01', group: 'Cannabis' },
  { key: 'administration_method', label: 'Admin Method', type: 'text', group: 'Cannabis' },
  // Ecommerce
  { key: 'regulatory_category', label: 'Regulatory Category', type: 'text', group: 'Ecommerce' },
  { key: 'external_category', label: 'External Category', type: 'text', group: 'Ecommerce' },
  { key: 'external_sub_category', label: 'External Sub-Category', type: 'text', group: 'Ecommerce' },
  { key: 'online_title', label: 'Online Title', type: 'text', group: 'Ecommerce' },
  // Additional
  { key: 'allergens', label: 'Allergens', type: 'text', group: 'Additional' },
  { key: 'ingredients', label: 'Ingredients', type: 'text', group: 'Additional' },
  { key: 'instructions', label: 'Instructions', type: 'text', group: 'Additional' },
]

function BulkEditPanel({
  count,
  onSubmit,
  onClose,
}: {
  count: number
  onSubmit: (updates: Record<string, unknown>) => void
  onClose: () => void
}) {
  const [selectedField, setSelectedField] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set())

  const toggleField = (key: string) => {
    setEnabledFields(prev => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  const setValue = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  function handleSubmit() {
    const updates: Record<string, unknown> = {}
    for (const key of enabledFields) {
      const field = BULK_EDIT_FIELDS.find(f => f.key === key)
      if (!field) continue
      const raw = values[key] ?? ''
      if (field.type === 'number') {
        updates[key] = raw ? parseFloat(raw) : null
      } else if (field.type === 'checkbox') {
        updates[key] = raw === 'true'
      } else {
        updates[key] = raw || null
      }
    }
    if (Object.keys(updates).length === 0) return
    onSubmit(updates)
  }

  // Group fields
  const groups = BULK_EDIT_FIELDS.reduce<Record<string, typeof BULK_EDIT_FIELDS>>((acc, f) => {
    ;(acc[f.group] ??= []).push(f)
    return acc
  }, {})

  const inputCls = 'bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-50 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500'
  const selectFilterCls = 'bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-50 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500'

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mt-2 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-200">Bulk Edit {count} product{count !== 1 ? 's' : ''}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xs">Cancel</button>
      </div>
      <p className="text-xs text-gray-400 mb-4">Check the fields you want to update. Only checked fields will be changed.</p>

      {/* Quick-add field picker */}
      <div className="flex gap-2 mb-4">
        <select value={selectedField} onChange={e => setSelectedField(e.target.value)} className={selectFilterCls + ' max-w-xs'}>
          <option value="">+ Add field to edit...</option>
          {BULK_EDIT_FIELDS.filter(f => !enabledFields.has(f.key)).map(f => (
            <option key={f.key} value={f.key}>{f.group}: {f.label}</option>
          ))}
        </select>
        {selectedField && (
          <button onClick={() => { toggleField(selectedField); setSelectedField('') }}
            className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
            Add
          </button>
        )}
      </div>

      {/* Active fields */}
      {enabledFields.size > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {Array.from(enabledFields).map(key => {
            const field = BULK_EDIT_FIELDS.find(f => f.key === key)
            if (!field) return null
            return (
              <div key={key} className="flex items-center gap-2 bg-gray-900 rounded-lg p-2 border border-gray-700">
                <button onClick={() => toggleField(key)} className="text-red-400 hover:text-red-300 text-xs shrink-0">X</button>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
                  {field.type === 'checkbox' ? (
                    <select value={values[key] ?? ''} onChange={e => setValue(key, e.target.value)} className={inputCls}>
                      <option value="">Select...</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : field.type === 'select' ? (
                    <select value={values[key] ?? ''} onChange={e => setValue(key, e.target.value)} className={inputCls}>
                      <option value="">Select...</option>
                      {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      step={field.step}
                      value={values[key] ?? ''}
                      onChange={e => setValue(key, e.target.value)}
                      className={inputCls}
                      placeholder={field.label}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-40"
        disabled={enabledFields.size === 0}
      >
        Apply to {count} Product{count !== 1 ? 's' : ''}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Bulk Tag Assign Panel                                              */
/* ------------------------------------------------------------------ */

function BulkTagPanel({
  count,
  tags,
  onSubmit,
  onClose,
}: {
  count: number
  tags: LookupOption[]
  onSubmit: (tagIds: string[]) => void
  onClose: () => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  function toggle(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-200">Assign Tags to {count} product{count !== 1 ? 's' : ''}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xs">Cancel</button>
      </div>
      <div className="max-h-48 overflow-y-auto mb-3 border border-gray-700 rounded-lg">
        {tags.length === 0 && (
          <p className="px-3 py-3 text-xs text-gray-500">No tags available</p>
        )}
        {tags.map(tag => (
          <label key={tag.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.includes(tag.id)}
              onChange={() => toggle(tag.id)}
              className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <span className="flex items-center gap-1.5 text-sm text-gray-200">
              {tag.color && (
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              )}
              {tag.name}
            </span>
          </label>
        ))}
      </div>
      <button
        onClick={() => onSubmit(selectedIds)}
        className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-40"
        disabled={selectedIds.length === 0}
      >
        Assign {selectedIds.length} Tag{selectedIds.length !== 1 ? 's' : ''}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

const COLUMN_COUNT = 16

export default function ProductListPage() {
  const { locationId, hydrated } = useSelectedLocation()

  /* Data */
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  /* Lookups */
  const [categories, setCategories] = useState<LookupOption[]>([])
  const [brands, setBrands] = useState<LookupOption[]>([])
  const [vendors, setVendors] = useState<LookupOption[]>([])
  const [tags, setTags] = useState<LookupOption[]>([])

  /* Filters */
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [cannabisFilter, setCannabisFilter] = useState<'' | 'true' | 'false'>('')
  const [onlineFilter, setOnlineFilter] = useState<'' | 'true' | 'false'>('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')

  /* Pagination */
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const totalPages = Math.ceil(total / perPage)

  /* Sort */
  const [sortBy, setSortBy] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  /* Selection */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  /* Bulk action panels */
  const [showPricePanel, setShowPricePanel] = useState(false)
  const [showTagPanel, setShowTagPanel] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  /* Import result message */
  const [importMessage, setImportMessage] = useState<string | null>(null)

  /* File input ref for CSV import */
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* Debounced search */
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search])

  /* Fetch lookups once */
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories ?? []))
    fetch('/api/brands').then(r => r.json()).then(d => setBrands(d.brands ?? []))
    fetch('/api/vendors').then(r => r.json()).then(d => setVendors(d.vendors ?? []))
    fetch('/api/tags').then(r => r.json()).then(d => setTags(d.tags ?? []))
  }, [])

  /* Map sortBy to API field name */
  function apiSortField(field: SortField): string {
    switch (field) {
      case 'name': return 'name'
      case 'sku': return 'sku'
      case 'rec_price': return 'rec_price'
      case 'med_price': return 'med_price'
      case 'cost_price': return 'cost_price'
      case 'available_qty': return 'name' // fallback, sort client-side
    }
  }

  /* Build current filter params as URLSearchParams */
  function buildFilterParams(): URLSearchParams {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      sortBy: apiSortField(sortBy),
      sortOrder,
    })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (categoryId) params.set('categoryId', categoryId)
    if (brandId) params.set('brandId', brandId)
    if (vendorId) params.set('vendorId', vendorId)
    if (cannabisFilter) params.set('isCannabis', cannabisFilter)
    if (statusFilter === 'active') params.set('isActive', 'true')
    else if (statusFilter === 'inactive') params.set('isActive', 'false')
    selectedTagIds.forEach(tid => params.append('tagId', tid))
    return params
  }

  /* Fetch products */
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      sortBy: apiSortField(sortBy),
      sortOrder,
    })

    if (locationId) params.set('location_id', locationId)
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (categoryId) params.set('categoryId', categoryId)
    if (brandId) params.set('brandId', brandId)
    if (vendorId) params.set('vendorId', vendorId)
    if (cannabisFilter) params.set('isCannabis', cannabisFilter)

    if (statusFilter === 'active') params.set('isActive', 'true')
    else if (statusFilter === 'inactive') params.set('isActive', 'false')

    selectedTagIds.forEach(tid => params.append('tagId', tid))

    const res = await fetch(`/api/products?${params}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      let fetched: Product[] = data.products ?? []

      // Client-side sort for available_qty (not supported server-side)
      if (sortBy === 'available_qty') {
        fetched = [...fetched].sort((a, b) => {
          const av = getAvailableQty(a)
          const bv = getAvailableQty(b)
          return sortOrder === 'asc' ? av - bv : bv - av
        })
      }

      setProducts(fetched)
      setTotal(data.pagination?.total ?? 0)
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, page, perPage, debouncedSearch, categoryId, brandId, vendorId, selectedTagIds, cannabisFilter, statusFilter, sortBy, sortOrder])

  useEffect(() => { if (hydrated) fetchProducts() }, [hydrated, fetchProducts])

  /* Sort handler */
  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
    setPage(1)
  }

  /* Filter reset */
  function resetFilters() {
    setSearch('')
    setDebouncedSearch('')
    setCategoryId('')
    setBrandId('')
    setVendorId('')
    setSelectedTagIds([])
    setCannabisFilter('')
    setOnlineFilter('')
    setStatusFilter('active')
    setPage(1)
  }

  const hasActiveFilters = search || categoryId || brandId || vendorId || selectedTagIds.length > 0 || cannabisFilter || onlineFilter || statusFilter !== 'active'

  /* Client-side online filter (applied after fetch) */
  const displayProducts = onlineFilter
    ? products.filter(p => {
        const isOnline = p.available_online ?? false
        return onlineFilter === 'true' ? isOnline : !isOnline
      })
    : products

  /* ---------------------------------------------------------------- */
  /*  Selection helpers                                                */
  /* ---------------------------------------------------------------- */

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === displayProducts.length && displayProducts.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayProducts.map(p => p.id)))
    }
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setShowPricePanel(false)
    setShowTagPanel(false)
  }

  const allVisibleSelected = displayProducts.length > 0 && selectedIds.size === displayProducts.length

  /* ---------------------------------------------------------------- */
  /*  Bulk actions                                                     */
  /* ---------------------------------------------------------------- */

  async function handleBulkDeactivate() {
    const count = selectedIds.size
    if (!confirm(`Are you sure you want to deactivate ${count} product${count !== 1 ? 's' : ''}? This will remove them from active inventory and POS.`)) return
    setBulkLoading(true)
    try {
      const res = await fetch('/api/products/bulk/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: Array.from(selectedIds) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to deactivate: ${err.error ?? 'Unknown error'}`)
      }
    } catch {
      alert('Network error while deactivating products.')
    } finally {
      setBulkLoading(false)
      clearSelection()
      fetchProducts()
    }
  }

  async function handleBulkEdit(updates: Record<string, unknown>) {
    setBulkLoading(true)
    try {
      const res = await fetch('/api/products/bulk/price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: Array.from(selectedIds), updates }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to update: ${err.error ?? 'Unknown error'}`)
      }
    } catch {
      alert('Network error while updating products.')
    } finally {
      setBulkLoading(false)
      clearSelection()
      fetchProducts()
    }
  }

  async function handleBulkTagAssign(tagIds: string[]) {
    setBulkLoading(true)
    try {
      const res = await fetch('/api/products/bulk/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: Array.from(selectedIds), tag_ids: tagIds, action: 'add' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to assign tags: ${err.error ?? 'Unknown error'}`)
      }
    } catch {
      alert('Network error while assigning tags.')
    } finally {
      setBulkLoading(false)
      clearSelection()
      fetchProducts()
    }
  }

  /* ---------------------------------------------------------------- */
  /*  CSV Export / Import                                               */
  /* ---------------------------------------------------------------- */

  function handleExportCsv() {
    const params = buildFilterParams()
    window.location.href = `/api/products/export?${params}`
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportMessage(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data) {
        const parts: string[] = []
        if (data.imported != null) parts.push(`${data.imported} imported`)
        if (data.updated != null) parts.push(`${data.updated} updated`)
        if (data.skipped != null) parts.push(`${data.skipped} skipped`)
        if (data.errors != null) parts.push(`${data.errors} errors`)
        setImportMessage(parts.length > 0 ? `Import complete: ${parts.join(', ')}.` : 'Import complete.')
        fetchProducts()
      } else {
        setImportMessage(`Import failed: ${data?.error ?? 'Unknown error'}`)
      }
    } catch {
      setImportMessage('Network error during import.')
    }
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const selectCls = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50"

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Products</h1>
        <div className="flex gap-2">
          <Link href="/products/brands" className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Brands</Link>
          <Link href="/products/vendors" className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Vendors</Link>
          <Link href="/products/strains" className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Strains</Link>
          <button
            onClick={handleExportCsv}
            className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCsv}
            className="hidden"
          />
          <Link href="/products/new" className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">+ New Product</Link>
        </div>
      </div>

      {/* Import result message */}
      {importMessage && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between ${importMessage.startsWith('Import complete') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          <span>{importMessage}</span>
          <button onClick={() => setImportMessage(null)} className="text-xs ml-3 hover:opacity-70">Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU, or title..."
            className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-50 w-72 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Category */}
        <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1) }} className={selectCls}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Brand */}
        <select value={brandId} onChange={(e) => { setBrandId(e.target.value); setPage(1) }} className={selectCls}>
          <option value="">All Brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        {/* Vendor */}
        <select value={vendorId} onChange={(e) => { setVendorId(e.target.value); setPage(1) }} className={selectCls}>
          <option value="">All Vendors</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>

        {/* Tags multi-select */}
        <TagMultiSelect
          options={tags}
          selected={selectedTagIds}
          onChange={(ids) => { setSelectedTagIds(ids); setPage(1) }}
        />

        {/* Cannabis toggle */}
        <select value={cannabisFilter} onChange={(e) => { setCannabisFilter(e.target.value as '' | 'true' | 'false'); setPage(1) }} className={selectCls}>
          <option value="">Cannabis & Non</option>
          <option value="true">Cannabis Only</option>
          <option value="false">Non-Cannabis Only</option>
        </select>

        {/* Online availability */}
        <select value={onlineFilter} onChange={(e) => { setOnlineFilter(e.target.value as '' | 'true' | 'false'); setPage(1) }} className={selectCls}>
          <option value="">Online: All</option>
          <option value="true">Online Available</option>
          <option value="false">Not Online</option>
        </select>

        {/* Status */}
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as 'active' | 'inactive' | 'all'); setPage(1) }} className={selectCls}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All Statuses</option>
        </select>

        {/* Reset */}
        {hasActiveFilters && (
          <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-gray-200 px-2 py-2 underline underline-offset-2">
            Reset filters
          </button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-gray-700 rounded-lg px-4 py-3 mb-4 flex items-center gap-3 flex-wrap sticky top-0 z-30">
          <span className="text-sm font-medium text-gray-100">{selectedIds.size} selected</span>
          <div className="h-5 w-px bg-gray-500" />
          <button
            onClick={handleBulkDeactivate}
            disabled={bulkLoading}
            className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50"
          >
            Deactivate
          </button>
          <button
            onClick={() => { setShowPricePanel(p => !p); setShowTagPanel(false) }}
            disabled={bulkLoading}
            className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50"
          >
            Bulk Edit
          </button>
          <button
            onClick={() => { setShowTagPanel(p => !p); setShowPricePanel(false) }}
            disabled={bulkLoading}
            className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50"
          >
            Assign Tags
          </button>
          <div className="h-5 w-px bg-gray-500" />
          <button
            onClick={clearSelection}
            className="text-sm px-3 py-1.5 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500"
          >
            Clear Selection
          </button>
          {bulkLoading && <span className="text-xs text-gray-400 ml-2">Processing...</span>}
        </div>
      )}

      {/* Bulk Edit Panel */}
      {showPricePanel && selectedIds.size > 0 && (
        <BulkEditPanel
          count={selectedIds.size}
          onSubmit={handleBulkEdit}
          onClose={() => setShowPricePanel(false)}
        />
      )}

      {/* Bulk Tag Panel */}
      {showTagPanel && selectedIds.size > 0 && (
        <BulkTagPanel
          count={selectedIds.size}
          tags={tags}
          onSubmit={handleBulkTagAssign}
          onClose={() => setShowTagPanel(false)}
        />
      )}

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                {/* Select All Checkbox */}
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                    title="Select all"
                  />
                </th>
                <th className="text-left px-4 py-3 w-10" />
                <SortHeader label="Name" field="name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <SortHeader label="SKU" field="sku" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <th className="text-left px-4 py-3">Master Cat</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Brand</th>
                <SortHeader label="Rec $" field="rec_price" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} align="right" />
                <SortHeader label="Med $" field="med_price" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} align="right" />
                <SortHeader label="Cost" field="cost_price" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} align="right" />
                <SortHeader label="Avail Qty" field="available_qty" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} align="right" />
                <th className="text-right px-4 py-3">Pkgs</th>
                <th className="text-right px-4 py-3">Margin</th>
                <th className="text-center px-4 py-3">Online</th>
                <th className="text-left px-4 py-3">Tags</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={COLUMN_COUNT} />)
              ) : displayProducts.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="text-center py-12 text-gray-500">
                    {hasActiveFilters ? 'No products match the current filters.' : 'No products found.'}
                  </td>
                </tr>
              ) : displayProducts.map((p) => {
                const qty = getAvailableQty(p)
                const imgUrl = getPrimaryImage(p)
                const isOnline = p.available_online ?? false
                const productTags = p.tags ?? []
                const isSelected = selectedIds.has(p.id)

                return (
                  <tr key={p.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${isSelected ? 'bg-gray-700/20' : ''}`}>
                    {/* Row Checkbox */}
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                      />
                    </td>

                    {/* Thumbnail */}
                    <td className="px-4 py-2">
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt={p.name}
                          width={36}
                          height={36}
                          className="rounded object-cover w-9 h-9"
                          unoptimized
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-gray-700 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-2.5">
                      <Link href={`/products/${p.id}/edit`} className="text-gray-50 hover:text-emerald-400 font-medium">
                        {p.name}
                      </Link>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-2.5 text-gray-400 text-xs tabular-nums font-mono">{p.sku ?? '\u2014'}</td>

                    {/* Master Category */}
                    <td className="px-4 py-2.5">
                      {p.category?.master_category ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 capitalize">
                          {p.category.master_category}
                        </span>
                      ) : (
                        <span className="text-gray-500">{'\u2014'}</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-2.5 text-gray-300">{p.category?.name ?? '\u2014'}</td>

                    {/* Brand */}
                    <td className="px-4 py-2.5 text-gray-300">{p.brand?.name ?? '\u2014'}</td>

                    {/* Rec Price */}
                    <td className="px-4 py-2.5 text-right text-gray-50 tabular-nums">{fmt(p.rec_price)}</td>

                    {/* Med Price */}
                    <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{fmt(p.med_price)}</td>

                    {/* Cost */}
                    <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{fmt(p.cost_price)}</td>

                    {/* Available Qty */}
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={qty === 0 ? 'text-red-400 font-medium' : 'text-gray-50'}>
                        {qty.toLocaleString()}
                      </span>
                      {qty === 0 && (
                        <span className="ml-1.5 text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">
                          OOS
                        </span>
                      )}
                    </td>

                    {/* Packages (SKU count) */}
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-400 text-sm">
                      {p.skuCount > 0 ? p.skuCount : '\u2014'}
                    </td>

                    {/* Margin */}
                    <td className="px-4 py-2.5 text-right text-sm">
                      {p.rec_price && p.cost_price ? (() => {
                        const margin = ((p.rec_price - p.cost_price) / p.rec_price) * 100
                        const color = margin >= 50 ? 'text-emerald-400' : margin >= 25 ? 'text-yellow-400' : 'text-red-400'
                        return <span className={color}>{margin.toFixed(1)}%</span>
                      })() : <span className="text-gray-600">—</span>}
                    </td>

                    {/* Online */}
                    <td className="px-4 py-2.5 text-center">
                      {isOnline ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400" title="Available online">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-700 text-gray-500" title="Not online">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </span>
                      )}
                    </td>

                    {/* Tags */}
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <div className="flex flex-wrap">
                        {productTags.length > 0
                          ? productTags.map(pt => (
                              <TagPill key={pt.id} name={pt.name} color={pt.color} />
                            ))
                          : <span className="text-gray-500 text-xs">{'\u2014'}</span>
                        }
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${p.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {total.toLocaleString()} product{total !== 1 ? 's' : ''}
            </span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40 hover:bg-gray-600 disabled:hover:bg-gray-700"
            >
              First
            </button>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40 hover:bg-gray-600 disabled:hover:bg-gray-700"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-xs text-gray-400">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40 hover:bg-gray-600 disabled:hover:bg-gray-700"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40 hover:bg-gray-600 disabled:hover:bg-gray-700"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
