'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

interface POLine {
  id: string
  product_id: string
  quantity_ordered: number
  quantity_received: number | null
  unit_cost: number | null
  total_cost: number | null
  notes: string | null
  products: { id: string; name: string; sku: string } | null
}

interface PurchaseOrder {
  id: string
  po_number: string
  status: string
  vendor_id: string | null
  location_id: string
  expected_delivery_date: string | null
  notes: string | null
  total_cost: number | null
  created_at: string | null
  submitted_at: string | null
  vendors: { id: string; name: string } | null
  locations: { id: string; name: string } | null
  employees: { id: string; first_name: string; last_name: string } | null
  purchase_order_lines: POLine[]
}

interface VendorOption { id: string; name: string }
interface LocationOption { id: string; name: string }
interface ProductOption { id: string; name: string; sku: string }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-600/20 text-gray-300',
  submitted: 'bg-blue-600/20 text-blue-400',
  partial: 'bg-amber-600/20 text-amber-400',
  received: 'bg-emerald-600/20 text-emerald-400',
  cancelled: 'bg-red-600/20 text-red-400',
}

function ReceiveModal({ lines, onClose, onReceive }: {
  lines: POLine[]
  onClose: () => void
  onReceive: (receivedLines: Array<{ line_id: string; quantity_received: number }>) => void
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const line of lines) {
      const remaining = line.quantity_ordered - (line.quantity_received ?? 0)
      init[line.id] = Math.max(0, remaining)
    }
    return init
  })
  const [submitting, setSubmitting] = useState(false)

  const handleReceive = async () => {
    setSubmitting(true)
    const receivedLines = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([lineId, qty]) => ({ line_id: lineId, quantity_received: qty }))
    await onReceive(receivedLines)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-gray-50">Receive Items</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-lg">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Ordered</th>
                <th className="text-right py-2">Previously Received</th>
                <th className="text-right py-2">Receiving Now</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(line => {
                const remaining = line.quantity_ordered - (line.quantity_received ?? 0)
                return (
                  <tr key={line.id} className="border-b border-gray-700/50">
                    <td className="py-3">
                      <div className="text-gray-50">{line.products?.name ?? 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{line.products?.sku ?? ''}</div>
                    </td>
                    <td className="text-right text-gray-300 tabular-nums">{line.quantity_ordered}</td>
                    <td className="text-right text-gray-400 tabular-nums">{line.quantity_received ?? 0}</td>
                    <td className="text-right">
                      <input
                        type="number"
                        min={0}
                        max={remaining}
                        value={quantities[line.id] ?? 0}
                        onChange={e => setQuantities(prev => ({
                          ...prev,
                          [line.id]: Math.min(remaining, Math.max(0, Number(e.target.value) || 0)),
                        }))}
                        className="w-20 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-gray-50 text-right tabular-nums"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
          <button
            onClick={handleReceive}
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? 'Receiving...' : 'Confirm Receive'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddLineForm({ poId, onAdded }: { poId: string; onAdded: () => void }) {
  const [products, setProducts] = useState<ProductOption[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null)
  const [qtyOrdered, setQtyOrdered] = useState(1)
  const [unitCost, setUnitCost] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchProducts = useCallback((query: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (query.length < 2) {
      setProducts([])
      setShowDropdown(false)
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        const items = (data.products ?? []).map((p: { id: string; name: string; sku: string }) => ({
          id: p.id, name: p.name, sku: p.sku,
        }))
        setProducts(items)
        setShowDropdown(true)
      }
    }, 300)
  }, [])

  const handleProductSearchChange = (value: string) => {
    setProductSearch(value)
    searchProducts(value)
  }

  const handleAdd = async () => {
    if (!selectedProduct) return
    setSubmitting(true)
    const res = await fetch(`/api/purchase-orders/${poId}/lines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: selectedProduct.id,
        quantity_ordered: qtyOrdered,
        unit_cost: Number(unitCost) || 0,
        notes: notes || null,
      }),
    })
    if (res.ok) {
      setSelectedProduct(null)
      setProductSearch('')
      setQtyOrdered(1)
      setUnitCost('')
      setNotes('')
      onAdded()
    }
    setSubmitting(false)
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Add Line Item</h3>
      <div className="grid grid-cols-12 gap-3 items-end">
        {/* Product search */}
        <div className="col-span-4 relative">
          <label className="block text-xs text-gray-400 mb-1">Product</label>
          {selectedProduct ? (
            <div className="flex items-center gap-2 h-10 px-3 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-50">
              <span className="flex-1 truncate">{selectedProduct.name}</span>
              <button onClick={() => { setSelectedProduct(null); setProductSearch('') }} className="text-gray-500 hover:text-gray-300 text-xs">
                &times;
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={productSearch}
                onChange={e => handleProductSearchChange(e.target.value)}
                onFocus={() => products.length > 0 && setShowDropdown(true)}
                placeholder="Search products..."
                className="w-full h-10 px-3 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-50 placeholder-gray-500"
              />
              {showDropdown && products.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                    {products.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setProductSearch(p.name); setShowDropdown(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                      >
                        <div>{p.name}</div>
                        <div className="text-xs text-gray-500">{p.sku}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Quantity */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Qty Ordered</label>
          <input
            type="number"
            min={1}
            value={qtyOrdered}
            onChange={e => setQtyOrdered(Math.max(1, Number(e.target.value) || 1))}
            className="w-full h-10 px-3 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-50 tabular-nums"
          />
        </div>

        {/* Unit Cost */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Unit Cost ($)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={unitCost}
            onChange={e => setUnitCost(e.target.value)}
            placeholder="0.00"
            className="w-full h-10 px-3 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-50 tabular-nums"
          />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional"
            className="w-full h-10 px-3 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-50 placeholder-gray-500"
          />
        </div>

        {/* Add button */}
        <div className="col-span-2">
          <button
            onClick={handleAdd}
            disabled={!selectedProduct || submitting}
            className="w-full h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Line'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { locationId: selectedLocationId, hydrated } = useSelectedLocation()
  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState('')

  // Editable fields (draft only)
  const [vendorId, setVendorId] = useState<string>('')
  const [locationId, setLocationId] = useState<string>('')
  const [expectedDate, setExpectedDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const fetchPO = useCallback(async () => {
    const params = new URLSearchParams()
    if (selectedLocationId) params.set('location_id', selectedLocationId)
    const qs = params.toString()
    const res = await fetch(`/api/purchase-orders/${id}${qs ? `?${qs}` : ''}`)
    if (res.ok) {
      const data = await res.json()
      const order = data.purchase_order as PurchaseOrder
      setPo(order)
      setVendorId(order.vendor_id ?? '')
      setLocationId(order.location_id ?? '')
      setExpectedDate(order.expected_delivery_date ?? '')
      setNotes(order.notes ?? '')
    }
    setLoading(false)
  }, [id, selectedLocationId])

  useEffect(() => { if (hydrated) fetchPO() }, [hydrated, fetchPO])

  useEffect(() => {
    const fetchOptions = async () => {
      const [vendorRes, locRes] = await Promise.all([
        fetch('/api/vendors?limit=100'),
        fetch('/api/auth/locations'),
      ])
      if (vendorRes.ok) {
        const data = await vendorRes.json()
        setVendors((data.vendors ?? []).map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })))
      }
      if (locRes.ok) {
        const data = await locRes.json()
        setLocations((data.locations ?? []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })))
      }
    }
    fetchOptions()
  }, [])

  const saveHeader = async () => {
    if (!po || po.status !== 'draft') return
    setSaving(true)
    await fetch(`/api/purchase-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor_id: vendorId || null,
        location_id: locationId || null,
        expected_delivery_date: expectedDate || null,
        notes: notes || null,
      }),
    })
    await fetchPO()
    setSaving(false)
  }

  const performAction = async (action: string) => {
    setActionLoading(action)
    const res = await fetch(`/api/purchase-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      await fetchPO()
    }
    setActionLoading('')
  }

  const handleReceive = async (receivedLines: Array<{ line_id: string; quantity_received: number }>) => {
    const res = await fetch(`/api/purchase-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'receive', lines: receivedLines }),
    })
    if (res.ok) {
      setShowReceiveModal(false)
      await fetchPO()
    }
  }

  const removeLine = async (lineId: string) => {
    const res = await fetch(`/api/purchase-orders/${id}/lines?line_id=${lineId}`, { method: 'DELETE' })
    if (res.ok) {
      await fetchPO()
    }
  }

  const formatMoney = (val: number | null): string => {
    if (val === null || val === undefined) return '$0.00'
    return `$${Number(val).toFixed(2)}`
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-500">Loading purchase order...</div>
  }

  if (!po) {
    return <div className="flex items-center justify-center py-20 text-gray-500">Purchase order not found</div>
  }

  const isDraft = po.status === 'draft'
  const isSubmitted = po.status === 'submitted'
  const isPartial = po.status === 'partial'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/inventory/purchase-orders')}
            className="text-gray-400 hover:text-gray-200 text-sm"
          >
            &larr; Back
          </button>
          <h1 className="text-xl font-bold text-gray-50">{po.po_number}</h1>
          <span className={`text-xs font-medium px-2.5 py-1 rounded capitalize ${STATUS_COLORS[po.status] ?? 'bg-gray-700 text-gray-300'}`}>
            {po.status}
          </span>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <>
              <button
                onClick={saveHeader}
                disabled={saving}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => performAction('submit')}
                disabled={actionLoading === 'submit'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {actionLoading === 'submit' ? 'Submitting...' : 'Submit'}
              </button>
              <button
                onClick={() => performAction('cancel')}
                disabled={actionLoading === 'cancel'}
                className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 disabled:opacity-50"
              >
                Cancel PO
              </button>
            </>
          )}
          {isSubmitted && (
            <>
              <button
                onClick={() => setShowReceiveModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500"
              >
                Mark Received
              </button>
              <button
                onClick={() => performAction('cancel')}
                disabled={actionLoading === 'cancel'}
                className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm hover:bg-red-600/30 disabled:opacity-50"
              >
                Cancel PO
              </button>
            </>
          )}
          {isPartial && (
            <>
              <button
                onClick={() => setShowReceiveModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500"
              >
                Receive More
              </button>
              <button
                onClick={() => performAction('complete_receiving')}
                disabled={actionLoading === 'complete_receiving'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {actionLoading === 'complete_receiving' ? 'Completing...' : 'Complete Receiving'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* PO Header Fields */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Vendor</label>
            {isDraft ? (
              <select
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50"
              >
                <option value="">Select vendor...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            ) : (
              <div className="h-10 px-3 flex items-center text-sm text-gray-300">{po.vendors?.name ?? '\u2014'}</div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Location</label>
            {isDraft ? (
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50"
              >
                <option value="">Select location...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            ) : (
              <div className="h-10 px-3 flex items-center text-sm text-gray-300">{po.locations?.name ?? '\u2014'}</div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Expected Delivery</label>
            {isDraft ? (
              <input
                type="date"
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50"
              />
            ) : (
              <div className="h-10 px-3 flex items-center text-sm text-gray-300">
                {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '\u2014'}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Total Cost</label>
            <div className="h-10 px-3 flex items-center text-sm text-gray-50 font-medium tabular-nums">
              {formatMoney(po.total_cost)}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs text-gray-400 mb-1">Notes</label>
          {isDraft ? (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Order notes..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 placeholder-gray-500 resize-none"
            />
          ) : (
            <div className="px-3 py-2 text-sm text-gray-300">{po.notes || '\u2014'}</div>
          )}
        </div>
        <div className="flex gap-6 mt-3 text-xs text-gray-500">
          <span>Created by: {po.employees ? `${po.employees.first_name} ${po.employees.last_name}` : '\u2014'}</span>
          <span>Created: {po.created_at ? new Date(po.created_at).toLocaleString() : '\u2014'}</span>
          {po.submitted_at && <span>Submitted: {new Date(po.submitted_at).toLocaleString()}</span>}
        </div>
      </div>

      {/* Add Line (draft only) */}
      {isDraft && (
        <div className="mb-6">
          <AddLineForm poId={id} onAdded={fetchPO} />
        </div>
      )}

      {/* Line Items Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300 uppercase">
            Line Items ({po.purchase_order_lines?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-left px-4 py-3">SKU</th>
              <th className="text-right px-4 py-3">Qty Ordered</th>
              <th className="text-right px-4 py-3">Unit Cost</th>
              <th className="text-right px-4 py-3">Total Cost</th>
              <th className="text-right px-4 py-3">Qty Received</th>
              {isDraft && <th className="text-right px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(po.purchase_order_lines ?? []).length === 0 ? (
              <tr><td colSpan={isDraft ? 7 : 6} className="text-center py-8 text-gray-500">No line items yet</td></tr>
            ) : (po.purchase_order_lines ?? []).map(line => (
              <tr key={line.id} className="border-b border-gray-700/50">
                <td className="px-4 py-2.5 text-gray-50">{line.products?.name ?? 'Unknown'}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{line.products?.sku ?? '\u2014'}</td>
                <td className="px-4 py-2.5 text-right text-gray-300 tabular-nums">{line.quantity_ordered}</td>
                <td className="px-4 py-2.5 text-right text-gray-300 tabular-nums">{formatMoney(line.unit_cost)}</td>
                <td className="px-4 py-2.5 text-right text-gray-300 tabular-nums">{formatMoney(line.total_cost)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className={
                    (line.quantity_received ?? 0) >= line.quantity_ordered
                      ? 'text-emerald-400'
                      : (line.quantity_received ?? 0) > 0
                        ? 'text-amber-400'
                        : 'text-gray-500'
                  }>
                    {line.quantity_received ?? 0}
                  </span>
                </td>
                {isDraft && (
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => removeLine(line.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receive Modal */}
      {showReceiveModal && (
        <ReceiveModal
          lines={po.purchase_order_lines ?? []}
          onClose={() => setShowReceiveModal(false)}
          onReceive={handleReceive}
        />
      )}
    </div>
  )
}
