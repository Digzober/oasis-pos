'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ManifestItem {
  id: string
  sku: string | null
  description: string
  package_id: string | null
  quantity: number
  batch: string | null
  brand: string | null
  unit_price: number
  subtotal: number
  discount: number
  total_price: number
  product_id: string | null
  inventory_item_id: string | null
}

interface ManifestNotes {
  invoice_comments?: string
  transaction_notes?: string
  customer_notes?: string
}

interface ManifestDetail {
  id: string
  title: string
  manifest_number: number | null
  customer_name: string | null
  created_date: string
  completed_date: string | null
  last_modified_date: string
  status: string
  type: string
  tab: string
  direction: string
  pickup: boolean
  subtotal: number
  taxes: number
  discounts: number
  credits: number
  total: number
  notes: ManifestNotes
  stop_number_on_route: number | null
  total_stops_on_route: number | null
  license_number: string | null
  point_of_contact: string | null
  driver_name: string | null
  driver_id: string | null
  source_location_id: string | null
  destination_location_id: string | null
  vendor_id: string | null
  items: ManifestItem[]
}

interface HistoryEntry {
  id: string
  action: string
  entity_type: string
  created_at: string
  metadata: Record<string, unknown>
  employee_name: string | null
}

interface InventorySearchResult {
  id: string
  product_id: string | null
  product_name: string
  sku: string | null
  barcode: string | null
  batch: string | null
  brand_name: string | null
  quantity_available: number
  unit_cost: number
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-blue-600/20 text-blue-400',
  open: 'bg-blue-600/20 text-blue-400',
  in_transit: 'bg-amber-600/20 text-amber-400',
  delivered: 'bg-emerald-600/20 text-emerald-400',
  sold: 'bg-emerald-600/20 text-emerald-400',
  cancelled: 'bg-red-600/20 text-red-400',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '\u2014'
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '\u2014'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

/* ------------------------------------------------------------------ */
/*  StatusBadge                                                        */
/* ------------------------------------------------------------------ */

function ManifestStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-600/20 text-gray-400'
  return (
    <span className={`inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1 capitalize ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Actions Dropdown                                                   */
/* ------------------------------------------------------------------ */

function ActionsDropdown({
  manifestId,
  onHistory,
}: {
  manifestId: string
  onHistory: () => void
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

  async function handleExport() {
    setOpen(false)
    window.open(`/api/manifests/${manifestId}/export`, '_blank')
  }

  function handlePrint() {
    setOpen(false)
    window.print()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="px-3 py-2 text-sm bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-1"
      >
        Actions
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <button
            onClick={handlePrint}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
          >
            Print manifest
          </button>
          <button
            onClick={handleExport}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
          >
            Export items
          </button>
          <button
            onClick={() => { onHistory(); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
          >
            History
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  History Modal                                                      */
/* ------------------------------------------------------------------ */

function HistoryModal({
  entries,
  loading,
  onClose,
}: {
  entries: HistoryEntry[]
  loading: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-gray-50">Manifest History</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-lg">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading history...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No history entries found</div>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <div key={entry.id} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-200 font-medium capitalize">
                      {entry.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(entry.created_at)}</span>
                  </div>
                  {entry.employee_name && (
                    <p className="text-xs text-gray-400">By: {entry.employee_name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add Items Modal                                                    */
/* ------------------------------------------------------------------ */

function AddItemsModal({
  manifestId,
  onClose,
  onItemsAdded,
}: {
  manifestId: string
  onClose: () => void
  onItemsAdded: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<InventorySearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Map<string, { item: InventorySearchResult; quantity: number }>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearch(query: string) {
    setSearchQuery(query)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/manifests/${manifestId}/items/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.items ?? data ?? [])
        }
      } catch {
        /* Search failures are non-critical */
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  function toggleItem(item: InventorySearchResult) {
    setSelectedItems(prev => {
      const next = new Map(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.set(item.id, { item, quantity: 1 })
      }
      return next
    })
  }

  function setItemQuantity(id: string, quantity: number) {
    setSelectedItems(prev => {
      const next = new Map(prev)
      const entry = next.get(id)
      if (entry) {
        next.set(id, { ...entry, quantity: Math.max(0, quantity) })
      }
      return next
    })
  }

  async function handleAdd() {
    if (selectedItems.size === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const items = Array.from(selectedItems.values()).filter(e => e.quantity > 0)
      for (const entry of items) {
        const res = await fetch(`/api/manifests/${manifestId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inventory_item_id: entry.item.id,
            product_id: entry.item.product_id,
            description: entry.item.product_name,
            sku: entry.item.sku,
            batch: entry.item.batch,
            brand: entry.item.brand_name,
            quantity: entry.quantity,
            unit_price: entry.item.unit_cost,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to add item' }))
          throw new Error(data.error ?? 'Failed to add item')
        }
      }
      onItemsAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add items')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-gray-50">Add Items</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-lg">&times;</button>
        </div>
        <div className="p-6 border-b border-gray-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search inventory by name, SKU, or barcode..."
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
              {error}
            </div>
          )}
          {searching ? (
            <div className="text-center py-8 text-gray-500">Searching...</div>
          ) : results.length === 0 && searchQuery.trim() ? (
            <div className="text-center py-8 text-gray-500">No inventory items found</div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Type to search inventory at source location</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                  <th className="text-left py-2 pr-3 w-8" />
                  <th className="text-left py-2 pr-3">Product</th>
                  <th className="text-left py-2 pr-3">SKU</th>
                  <th className="text-left py-2 pr-3">Brand</th>
                  <th className="text-right py-2 pr-3">Available</th>
                  <th className="text-right py-2 pr-3">Cost</th>
                  <th className="text-right py-2">Qty</th>
                </tr>
              </thead>
              <tbody>
                {results.map(item => {
                  const isSelected = selectedItems.has(item.id)
                  const entry = selectedItems.get(item.id)
                  return (
                    <tr key={item.id} className={`border-b border-gray-700/50 ${isSelected ? 'bg-emerald-900/10' : ''}`}>
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(item)}
                          className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                      </td>
                      <td className="py-2 pr-3 text-gray-200">{item.product_name}</td>
                      <td className="py-2 pr-3 text-gray-400 font-mono text-xs">{item.sku ?? '\u2014'}</td>
                      <td className="py-2 pr-3 text-gray-400">{item.brand_name ?? '\u2014'}</td>
                      <td className="py-2 pr-3 text-right text-gray-300 tabular-nums">{item.quantity_available}</td>
                      <td className="py-2 pr-3 text-right text-gray-300 tabular-nums">{formatCurrency(item.unit_cost)}</td>
                      <td className="py-2 text-right">
                        {isSelected && (
                          <input
                            type="number"
                            min={0}
                            max={item.quantity_available}
                            value={entry?.quantity ?? 1}
                            onChange={(e) => setItemQuantity(item.id, Number(e.target.value))}
                            className="w-20 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-gray-50 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
          <span className="text-xs text-gray-400">
            {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedItems.size === 0 || submitting}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Adding...' : `Add ${selectedItems.size} Item${selectedItems.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail Field Row                                                   */
/* ------------------------------------------------------------------ */

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-700/50 last:border-0">
      <span className="text-xs text-gray-400 uppercase tracking-wider shrink-0 w-32">{label}</span>
      <span className="text-sm text-gray-100 text-right">{children}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Detail Page                                                   */
/* ------------------------------------------------------------------ */

export default function ManifestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { locationId, hydrated } = useSelectedLocation()
  const [manifest, setManifest] = useState<ManifestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showAddItems, setShowAddItems] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [editingQty, setEditingQty] = useState<string | null>(null)
  const [editQtyValue, setEditQtyValue] = useState<number>(0)
  const [notes, setNotes] = useState<ManifestNotes>({})
  const [notesDirty, setNotesDirty] = useState(false)
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; phone: string | null; state_id: string | null }>>([])
  const [driverSaving, setDriverSaving] = useState(false)
  const noteSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Fetch manifest detail */
  const fetchManifest = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (locationId) params.set('location_id', locationId)
      const qs = params.toString()
      const res = await fetch(`/api/manifests/${id}${qs ? `?${qs}` : ''}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to load manifest' }))
        setError(data.error ?? 'Failed to load manifest')
        return
      }
      const data = await res.json()
      const m = data.manifest ?? data
      setManifest(m)
      setNotes(m.notes ?? {})
    } catch {
      setError('Network error loading manifest')
    } finally {
      setLoading(false)
    }
  }, [id, locationId])

  useEffect(() => { if (hydrated) fetchManifest() }, [hydrated, fetchManifest])

  // Fetch drivers
  useEffect(() => {
    fetch('/api/drivers').then(r => r.ok ? r.json() : { drivers: [] }).then(d => setDrivers(d.drivers ?? [])).catch(() => {})
  }, [])

  async function handleDriverAssign(driverId: string) {
    if (!manifest) return
    setDriverSaving(true)
    const driver = drivers.find(d => d.id === driverId)
    await fetch(`/api/manifests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driver_id: driverId || null,
        driver_name: driver?.name || null,
      }),
    })
    await fetchManifest()
    setDriverSaving(false)
  }

  /* Auto-save notes */
  function handleNoteChange(field: keyof ManifestNotes, value: string) {
    const updated = { ...notes, [field]: value }
    setNotes(updated)
    setNotesDirty(true)
    if (noteSaveTimeout.current) clearTimeout(noteSaveTimeout.current)
    noteSaveTimeout.current = setTimeout(async () => {
      try {
        await fetch(`/api/manifests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: updated }),
        })
        setNotesDirty(false)
      } catch {
        /* Note save failures are non-critical */
      }
    }, 1000)
  }

  /* Status transition actions */
  async function handleSend() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/manifests/${id}/send`, { method: 'POST' })
      if (res.ok) await fetchManifest()
    } catch {
      /* Action failures will be visible in status */
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReceive() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/manifests/${id}/receive`, { method: 'POST' })
      if (res.ok) await fetchManifest()
    } catch {
      /* Action failures will be visible in status */
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReopen() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/manifests/${id}/reopen`, { method: 'POST' })
      if (res.ok) await fetchManifest()
    } catch {
      /* Action failures will be visible in status */
    } finally {
      setActionLoading(false)
    }
  }

  /* History */
  async function handleShowHistory() {
    setShowHistory(true)
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/manifests/${id}/history`)
      if (res.ok) {
        const data = await res.json()
        setHistoryEntries(data.entries ?? data ?? [])
      }
    } catch {
      /* History load failures shown as empty */
    } finally {
      setHistoryLoading(false)
    }
  }

  /* Item quantity inline edit */
  async function handleSaveQuantity(itemId: string) {
    try {
      const res = await fetch(`/api/manifests/${id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: editQtyValue }),
      })
      if (res.ok) {
        await fetchManifest()
      }
    } catch {
      /* Inline edit failures are non-critical */
    }
    setEditingQty(null)
  }

  /* Remove item */
  async function handleRemoveItem(itemId: string) {
    try {
      const res = await fetch(`/api/manifests/${id}/items/${itemId}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchManifest()
      }
    } catch {
      /* Remove failures are non-critical */
    }
  }

  /* Loading state */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading manifest...</div>
      </div>
    )
  }

  /* Error state */
  if (error || !manifest) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-red-400">{error ?? 'Manifest not found'}</div>
        <Link
          href="/inventory/manifests"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          Back to manifests
        </Link>
      </div>
    )
  }

  const isEditable = manifest.status === 'draft' || manifest.status === 'open'

  /* Primary action button */
  function renderPrimaryAction() {
    if (!manifest) return null
    const btnBase = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40'
    switch (manifest.status) {
      case 'draft':
      case 'open':
        return (
          <button
            onClick={handleSend}
            disabled={actionLoading}
            className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-500`}
          >
            {actionLoading ? 'Sending...' : 'Send'}
          </button>
        )
      case 'in_transit':
        return (
          <button
            onClick={handleReceive}
            disabled={actionLoading}
            className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-500`}
          >
            {actionLoading ? 'Receiving...' : 'Receive'}
          </button>
        )
      case 'sold':
        return (
          <button
            onClick={handleReopen}
            disabled={actionLoading}
            className={`${btnBase} bg-amber-600 text-white hover:bg-amber-500`}
          >
            {actionLoading ? 'Reopening...' : 'Reopen'}
          </button>
        )
      default:
        return null
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/manifests"
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-50">{manifest.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ActionsDropdown manifestId={id} onHistory={handleShowHistory} />
          {renderPrimaryAction()}
        </div>
      </div>

      {/* Two-column card layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Details */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Details</h2>
          <DetailRow label="Order #">{manifest.manifest_number ?? '\u2014'}</DetailRow>
          <DetailRow label="Customer">{manifest.customer_name ?? '\u2014'}</DetailRow>
          <DetailRow label="Date">{formatDateShort(manifest.created_date)}</DetailRow>
          <DetailRow label="Last Modified">{formatDate(manifest.last_modified_date)}</DetailRow>
          <DetailRow label="Status"><ManifestStatusBadge status={manifest.status} /></DetailRow>
          <DetailRow label="Type"><span className="capitalize">{manifest.type}</span></DetailRow>
          <DetailRow label="Pickup">{manifest.pickup ? 'Yes' : 'No'}</DetailRow>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <DetailRow label="Subtotal">{formatCurrency(manifest.subtotal)}</DetailRow>
            <DetailRow label="Taxes">{formatCurrency(manifest.taxes)}</DetailRow>
            <DetailRow label="Discounts">{formatCurrency(manifest.discounts)}</DetailRow>
            <DetailRow label="Credit">{formatCurrency(manifest.credits)}</DetailRow>
            <DetailRow label="Total">
              <span className="font-semibold">{formatCurrency(manifest.total)}</span>
            </DetailRow>
          </div>
        </div>

        {/* Right: Notes + Driver Info */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Notes</h2>
              {notesDirty && <span className="text-xs text-gray-500">Saving...</span>}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Invoice Comments</label>
                <textarea
                  value={notes.invoice_comments ?? ''}
                  onChange={(e) => handleNoteChange('invoice_comments', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  placeholder="Invoice comments..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Transaction Notes</label>
                <textarea
                  value={notes.transaction_notes ?? ''}
                  onChange={(e) => handleNoteChange('transaction_notes', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  placeholder="Transaction notes..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Customer Notes</label>
                <textarea
                  value={notes.customer_notes ?? ''}
                  onChange={(e) => handleNoteChange('customer_notes', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  placeholder="Customer notes..."
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Driver Info</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Assigned Driver</label>
                <select
                  value={manifest.driver_id ?? ''}
                  onChange={e => handleDriverAssign(e.target.value)}
                  disabled={driverSaving}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                >
                  <option value="">No driver assigned</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}{d.phone ? ` (${d.phone})` : ''}{d.state_id ? ` — ID: ${d.state_id}` : ''}</option>
                  ))}
                </select>
                {driverSaving && <span className="text-xs text-gray-500 mt-1">Saving...</span>}
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <DetailRow label="Stop #">{manifest.stop_number_on_route ?? '\u2014'}</DetailRow>
              <DetailRow label="Total Stops">{manifest.total_stops_on_route ?? '\u2014'}</DetailRow>
              <DetailRow label="License #">{manifest.license_number ?? '\u2014'}</DetailRow>
              <DetailRow label="Contact">{manifest.point_of_contact ?? '\u2014'}</DetailRow>
            </div>
          </div>
        </div>
      </div>

      {/* Items section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Items ({manifest.items.length})
          </h2>
          {isEditable && (
            <button
              onClick={() => setShowAddItems(true)}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              Add items
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">SKU</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Package ID</th>
                <th className="text-right px-4 py-3">Quantity</th>
                <th className="text-left px-4 py-3">Batch</th>
                <th className="text-left px-4 py-3">Brand</th>
                <th className="text-right px-4 py-3">Unit Price</th>
                <th className="text-right px-4 py-3">Subtotal</th>
                <th className="text-right px-4 py-3">Discount</th>
                <th className="text-right px-4 py-3">Total Price</th>
                {isEditable && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody>
              {manifest.items.length === 0 ? (
                <tr>
                  <td colSpan={isEditable ? 11 : 10} className="text-center py-12 text-gray-500">
                    No items added yet
                  </td>
                </tr>
              ) : manifest.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{item.sku ?? '\u2014'}</td>
                  <td className="px-4 py-2.5 text-gray-200">{item.description}</td>
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{item.package_id ?? '\u2014'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {isEditable && editingQty === item.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          value={editQtyValue}
                          onChange={(e) => setEditQtyValue(Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveQuantity(item.id)
                            if (e.key === 'Escape') setEditingQty(null)
                          }}
                          className="w-20 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-gray-50 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveQuantity(item.id)}
                          className="text-emerald-400 hover:text-emerald-300 text-xs"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-gray-50 ${isEditable ? 'cursor-pointer hover:text-emerald-400' : ''}`}
                        onClick={() => {
                          if (isEditable) {
                            setEditingQty(item.id)
                            setEditQtyValue(item.quantity)
                          }
                        }}
                      >
                        {item.quantity}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{item.batch ?? '\u2014'}</td>
                  <td className="px-4 py-2.5 text-gray-400">{item.brand ?? '\u2014'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-300 tabular-nums">{formatCurrency(item.unit_price)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-300 tabular-nums">{formatCurrency(item.subtotal)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{formatCurrency(item.discount)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-50 tabular-nums font-medium">{formatCurrency(item.total_price)}</td>
                  {isEditable && (
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
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
      </div>

      {/* Modals */}
      {showAddItems && (
        <AddItemsModal
          manifestId={id}
          onClose={() => setShowAddItems(false)}
          onItemsAdded={fetchManifest}
        />
      )}

      {showHistory && (
        <HistoryModal
          entries={historyEntries}
          loading={historyLoading}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}
