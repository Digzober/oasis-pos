'use client'

import { useState, useEffect, useRef } from 'react'
import BaseActionModal from './BaseActionModal'
import { SearchableSelect } from '@/components/shared/SearchableSelect'

const inputCls =
  'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'

interface ConvertModalProps {
  itemId: string
  productName: string
  packageId: string | null
  currentQty: number
  unit?: string
  onClose: () => void
  onSuccess: () => void
}

interface ProductResult {
  id: string
  name: string
}

export default function ConvertModal({
  itemId,
  productName,
  packageId,
  currentQty,
  unit = 'units',
  onClose,
  onSuccess,
}: ConvertModalProps) {
  const [sourceQty, setSourceQty] = useState(currentQty)
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<ProductResult[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [newPackageId, setNewPackageId] = useState('')
  const [newQty, setNewQty] = useState(0)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [batchId, setBatchId] = useState('')
  const [packageDate, setPackageDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [expirationDate, setExpirationDate] = useState('')
  const [cost, setCost] = useState(0)
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([])
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function fetchLookups() {
      const [roomsRes, vendorsRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/vendors'),
      ])
      if (roomsRes.ok) setRooms(await roomsRes.json())
      if (vendorsRes.ok) setVendors(await vendorsRes.json())
    }
    fetchLookups()
  }, [])

  useEffect(() => {
    if (!productSearch || productSearch.length < 2) {
      setProducts([])
      setShowResults(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(
        `/api/products?search=${encodeURIComponent(productSearch)}&per_page=20`
      )
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.data ?? []
        setProducts(items)
        setShowResults(true)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [productSearch])

  function generatePackageId() {
    const ts = Date.now().toString(36).toUpperCase()
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
    setNewPackageId(`PKG-${ts}-${rand}`)
  }

  function generateBatchId() {
    const ts = Date.now().toString(36).toUpperCase()
    setBatchId(`BATCH-${ts}`)
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  const roomOptions = rooms.map((r) => ({ value: r.id, label: r.name }))
  const vendorOptions = vendors.map((v) => ({ value: v.id, label: v.name }))

  async function handleSubmit() {
    const res = await fetch('/api/inventory/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_item_id: itemId,
        source_quantity: sourceQty,
        target_product_id: selectedProductId,
        new_package_id: newPackageId,
        quantity: newQty,
        vendor_id: vendorId,
        room_id: roomId,
        batch_id: batchId,
        package_date: packageDate,
        expiration_date: expirationDate || null,
        cost,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to convert package')
    }
    onSuccess()
    onClose()
  }

  return (
    <BaseActionModal
      title="Convert Package"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Convert"
      submitDisabled={!selectedProductId || newQty <= 0}
      wide
    >
      <div className="space-y-6">
        {/* FROM section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            From (Source)
          </h3>
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
            <div>
              <label className={labelCls}>Product</label>
              <input type="text" readOnly value={productName} className={`${inputCls} opacity-60`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Package ID</label>
                <input type="text" readOnly value={packageId ?? 'N/A'} className={`${inputCls} opacity-60`} />
              </div>
              <div>
                <label className={labelCls}>Quantity to Convert</label>
                <input
                  type="number"
                  value={sourceQty}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v) && v >= 0 && v <= currentQty) setSourceQty(v)
                  }}
                  max={currentQty}
                  min={0}
                  step="any"
                  className={inputCls}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {currentQty} {unit}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TO section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            To (Target)
          </h3>
          <div className="space-y-3">
            {/* Product search */}
            <div className="relative">
              <label className={labelCls}>Product</label>
              <input
                type="text"
                value={selectedProduct ? selectedProduct.name : productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value)
                  setSelectedProductId(null)
                }}
                placeholder="Search for a product..."
                className={inputCls}
                onFocus={() => products.length > 0 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
              />
              {showResults && products.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                      onMouseDown={() => {
                        setSelectedProductId(p.id)
                        setProductSearch(p.name)
                        setShowResults(false)
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Package ID */}
            <div>
              <label className={labelCls}>Package ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPackageId}
                  onChange={(e) => setNewPackageId(e.target.value)}
                  placeholder="Enter or generate"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={generatePackageId}
                  className="shrink-0 px-3 h-10 text-xs font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className={labelCls}>Quantity</label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(parseFloat(e.target.value) || 0)}
                min={0}
                step="any"
                className={inputCls}
              />
            </div>

            {/* Vendor & Room */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Vendor</label>
                <SearchableSelect
                  options={vendorOptions}
                  value={vendorId}
                  onChange={setVendorId}
                  placeholder="Select vendor..."
                  searchPlaceholder="Search vendors..."
                  emptyMessage="No vendors found"
                />
              </div>
              <div>
                <label className={labelCls}>Room</label>
                <SearchableSelect
                  options={roomOptions}
                  value={roomId}
                  onChange={setRoomId}
                  placeholder="Select room..."
                  searchPlaceholder="Search rooms..."
                  emptyMessage="No rooms found"
                />
              </div>
            </div>

            {/* Batch name */}
            <div>
              <label className={labelCls}>Batch Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  placeholder="Enter or generate"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={generateBatchId}
                  className="shrink-0 px-3 h-10 text-xs font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Package Date</label>
                <input
                  type="date"
                  value={packageDate}
                  onChange={(e) => setPackageDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Expiration Date</label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Cost */}
            <div>
              <label className={labelCls}>Cost ($)</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                min={0}
                step="0.01"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>
    </BaseActionModal>
  )
}
