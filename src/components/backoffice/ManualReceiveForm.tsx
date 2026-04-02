'use client'

import { useState, useEffect, useCallback } from 'react'
import { SearchableSelect } from '@/components/shared/SearchableSelect'

interface SelectOption {
  value: string
  label: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export default function ManualReceiveForm({ onClose }: { onClose: () => void }) {
  // Core fields
  const [productId, setProductId] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('')
  const [cost, setCost] = useState('')
  const [barcode, setBarcode] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [expiration, setExpiration] = useState('')
  const [notes, setNotes] = useState('')

  // New fields
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [producerId, setProducerId] = useState<string | null>(null)
  const [strainId, setStrainId] = useState<string | null>(null)
  const [flowerEquivalent, setFlowerEquivalent] = useState('')
  const [medPrice, setMedPrice] = useState('')
  const [recPrice, setRecPrice] = useState('')
  const [inventoryStatus, setInventoryStatus] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Dropdown data
  const [productOptions, setProductOptions] = useState<SelectOption[]>([])
  const [vendorOptions, setVendorOptions] = useState<SelectOption[]>([])
  const [producerOptions, setProducerOptions] = useState<SelectOption[]>([])
  const [strainOptions, setStrainOptions] = useState<SelectOption[]>([])
  const [roomOptions, setRoomOptions] = useState<SelectOption[]>([])
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([])
  const [tagOptions, setTagOptions] = useState<SelectOption[]>([])

  // UI state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchDropdownData = useCallback(async () => {
    setLoading(true)
    const requests = [
      fetch('/api/products?limit=100').then((r) => r.json()),
      fetch('/api/vendors').then((r) => r.json()),
      fetch('/api/strains').then((r) => r.json()),
      fetch('/api/rooms').then((r) => r.json()),
      fetch('/api/settings/inventory-statuses').then((r) => r.json()),
    ]

    const [productsRes, vendorsRes, strainsRes, roomsRes, statusesRes] = await Promise.all(requests)

    const products: AnyRecord[] = productsRes.products ?? productsRes.data ?? []
    setProductOptions(products.map((p) => ({ value: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ''}` })))

    const vendors: AnyRecord[] = vendorsRes.vendors ?? vendorsRes.data ?? []
    setVendorOptions(vendors.map((v) => ({ value: v.id, label: v.name })))
    setProducerOptions(vendors.map((v) => ({ value: v.id, label: v.name })))

    const strains: AnyRecord[] = strainsRes.strains ?? strainsRes.data ?? []
    setStrainOptions(strains.map((s) => ({ value: s.id, label: s.name })))

    const rooms: AnyRecord[] = roomsRes.rooms ?? roomsRes.data ?? []
    setRoomOptions(rooms.map((r) => ({ value: r.id, label: r.name })))

    const statuses: AnyRecord[] = statusesRes.statuses ?? statusesRes.data ?? []
    setStatusOptions(statuses.map((s) => ({
      value: typeof s === 'string' ? s : s.id ?? s.value ?? s.name,
      label: typeof s === 'string' ? s : s.name ?? s.label ?? s.value,
    })))

    // Set default room if available
    if (rooms.length > 0) {
      const receivingRoom = rooms.find((r: AnyRecord) =>
        Array.isArray(r.room_type) ? r.room_type.includes('receiving') || r.room_type.includes('back_of_house') : false
      )
      const firstRoom = rooms[0] as AnyRecord | undefined
      setRoomId(receivingRoom?.id ?? firstRoom?.id ?? null)
    }

    // Set default inventory status
    if (statuses.length > 0) {
      const defaultStatus = statuses.find((s: AnyRecord) =>
        typeof s === 'string' ? s === 'Available' : (s.name === 'Available' || s.is_default)
      )
      if (defaultStatus) {
        setInventoryStatus(typeof defaultStatus === 'string' ? defaultStatus : defaultStatus.id ?? defaultStatus.value ?? defaultStatus.name)
      }
    }

    setLoading(false)
  }, [])

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/tags?type=inventory')
    const data = await res.json()
    const tags: AnyRecord[] = data.tags ?? data.data ?? []
    setTagOptions(tags.map((t) => ({ value: t.id, label: t.name })))
  }, [])

  useEffect(() => {
    fetchDropdownData()
    fetchTags()
  }, [fetchDropdownData, fetchTags])

  const handleProductChange = useCallback(async (id: string | null) => {
    setProductId(id)
    if (!id) return

    try {
      const res = await fetch(`/api/products/${id}?include=brand,vendor,strain,category`)
      if (!res.ok) return
      const product = await res.json()

      // Auto-populate from product data (only if field is currently empty)
      if (!vendorId && product.vendor_id) setVendorId(product.vendor_id)
      if (!strainId && product.strain_id) setStrainId(product.strain_id)
      if (!medPrice && product.med_price != null) setMedPrice(String(product.med_price))
      if (!recPrice && product.rec_price != null) setRecPrice(String(product.rec_price))
      if (!cost && product.cost != null) setCost(String(product.cost))
      if (!flowerEquivalent && product.category?.default_flower_equivalent != null) {
        setFlowerEquivalent(String(product.category.default_flower_equivalent))
      }
    } catch {
      // Product detail fetch is best-effort for auto-population
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, strainId, medPrice, recPrice, cost, flowerEquivalent])

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || !quantity) {
      setError('Product and quantity are required')
      return
    }
    setSaving(true)
    setError('')

    const res = await fetch('/api/inventory/receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        room_id: roomId || undefined,
        quantity: parseFloat(quantity),
        cost_per_unit: cost ? parseFloat(cost) : null,
        barcode: barcode || null,
        lot_number: lotNumber || null,
        expiration_date: expiration || null,
        notes: notes || null,
        vendor_id: vendorId || null,
        strain_id: strainId || null,
        flower_equivalent: flowerEquivalent ? parseFloat(flowerEquivalent) : null,
        med_price: medPrice ? parseFloat(medPrice) : null,
        rec_price: recPrice ? parseFloat(recPrice) : null,
        inventory_status: inventoryStatus || null,
        tags: selectedTags,
      }),
    })

    if (res.ok) {
      setSuccess(true)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to receive inventory')
    }
    setSaving(false)
  }

  const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const labelCls = 'block'
  const labelTextCls = 'text-xs text-gray-400 mb-1 block'

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full text-center">
          <p className="text-emerald-400 text-lg font-bold mb-2">Inventory Received</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center overflow-y-auto py-8">
      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl p-6 space-y-4 my-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-50">Manual Receive</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-200 text-lg">X</button>
        </div>

        {loading && <p className="text-gray-500 text-sm">Loading form data...</p>}

        {/* Product Selection */}
        <label className={labelCls}>
          <span className={labelTextCls}>Product *</span>
          <SearchableSelect
            options={productOptions}
            value={productId}
            onChange={handleProductChange}
            placeholder="Select product..."
            searchPlaceholder="Search products..."
            loading={loading}
          />
        </label>

        {/* Vendor & Producer Row */}
        <div className="grid grid-cols-2 gap-4">
          <label className={labelCls}>
            <span className={labelTextCls}>Vendor</span>
            <SearchableSelect
              options={vendorOptions}
              value={vendorId}
              onChange={setVendorId}
              placeholder="Select vendor..."
              searchPlaceholder="Search vendors..."
              loading={loading}
            />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Producer</span>
            <SearchableSelect
              options={producerOptions}
              value={producerId}
              onChange={setProducerId}
              placeholder="Select producer..."
              searchPlaceholder="Search producers..."
              loading={loading}
            />
          </label>
        </div>

        {/* Strain & Room Row */}
        <div className="grid grid-cols-2 gap-4">
          <label className={labelCls}>
            <span className={labelTextCls}>Strain</span>
            <SearchableSelect
              options={strainOptions}
              value={strainId}
              onChange={setStrainId}
              placeholder="Select strain..."
              searchPlaceholder="Search strains..."
              loading={loading}
            />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Room *</span>
            <SearchableSelect
              options={roomOptions}
              value={roomId}
              onChange={setRoomId}
              placeholder="Select room..."
              searchPlaceholder="Search rooms..."
              loading={loading}
            />
          </label>
        </div>

        {/* Quantity & Cost Row */}
        <div className="grid grid-cols-2 gap-4">
          <label className={labelCls}>
            <span className={labelTextCls}>Quantity *</span>
            <input type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} required />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Cost per Unit</span>
            <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={inputCls} />
          </label>
        </div>

        {/* Pricing Row */}
        <div className="grid grid-cols-3 gap-4">
          <label className={labelCls}>
            <span className={labelTextCls}>Med Price</span>
            <input type="number" step="0.01" value={medPrice} onChange={(e) => setMedPrice(e.target.value)} className={inputCls} placeholder="0.00" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Rec Price</span>
            <input type="number" step="0.01" value={recPrice} onChange={(e) => setRecPrice(e.target.value)} className={inputCls} placeholder="0.00" />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Flower Equivalent (g)</span>
            <input type="number" step="0.001" value={flowerEquivalent} onChange={(e) => setFlowerEquivalent(e.target.value)} className={inputCls} placeholder="0.000" />
          </label>
        </div>

        {/* Barcode & Lot Number Row */}
        <div className="grid grid-cols-2 gap-4">
          <label className={labelCls}>
            <span className={labelTextCls}>Barcode</span>
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className={inputCls} />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Lot Number</span>
            <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className={inputCls} />
          </label>
        </div>

        {/* Expiration & Inventory Status Row */}
        <div className="grid grid-cols-2 gap-4">
          <label className={labelCls}>
            <span className={labelTextCls}>Expiration Date</span>
            <input type="date" value={expiration} onChange={(e) => setExpiration(e.target.value)} className={inputCls} />
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Inventory Status</span>
            <SearchableSelect
              options={statusOptions}
              value={inventoryStatus}
              onChange={setInventoryStatus}
              placeholder="Select status..."
              loading={loading}
            />
          </label>
        </div>

        {/* Tags Multi-Select */}
        <div>
          <span className={labelTextCls}>Tags</span>
          <div className="flex flex-wrap gap-2 p-2 bg-gray-900 border border-gray-600 rounded-lg min-h-[40px]">
            {tagOptions.length === 0 && <span className="text-gray-500 text-xs py-1">No tags available</span>}
            {tagOptions.map((tag) => {
              const isSelected = selectedTags.includes(tag.value)
              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-300'
                  }`}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <label className={labelCls}>
          <span className={labelTextCls}>Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls + ' h-16'} />
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
          <button type="submit" disabled={saving || loading} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? 'Receiving...' : 'Receive'}
          </button>
        </div>
      </form>
    </div>
  )
}
