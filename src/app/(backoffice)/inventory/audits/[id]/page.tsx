'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuditSummary {
  totalItems: number
  countedItems: number
  discrepancyItems: number
}

interface Audit {
  id: string
  name: string
  status: string
  notes: string | null
  scope_rooms: string[] | null
  scope_categories: string[] | null
  scope_room_names: string[]
  scope_category_names: string[]
  created_at: string | null
  started_at: string | null
  completed_at: string | null
  location: { id: string; name: string } | null
  created_by_employee: { id: string; first_name: string; last_name: string } | null
  summary: AuditSummary
}

interface AuditItem {
  id: string
  audit_id: string
  inventory_item_id: string
  product_id: string | null
  expected_quantity: number
  counted_quantity: number | null
  discrepancy: number | null
  notes: string | null
  counted_at: string | null
  products: { id: string; name: string; sku: string | null } | null
  inventory_items: {
    id: string
    barcode: string | null
    batch_id: string | null
    room_id: string | null
    rooms: { id: string; name: string } | null
  } | null
  employees: { id: string; first_name: string; last_name: string } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-raised text-primary',
  in_progress: 'bg-yellow-600 text-yellow-100',
  review: 'bg-info text-info',
  completed: 'bg-success text-success',
  cancelled: 'bg-danger text-danger',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-raised text-primary'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtDate(d: string | null): string {
  if (!d) return '\u2014'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function fmtQty(n: number | null): string {
  if (n == null) return '\u2014'
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}

/* ------------------------------------------------------------------ */
/*  Discrepancy Indicator                                              */
/* ------------------------------------------------------------------ */

function DiscrepancyCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted">\u2014</span>
  if (value === 0) return <span className="text-success">0</span>
  const color = value > 0 ? 'text-info' : 'text-danger'
  const prefix = value > 0 ? '+' : ''
  return <span className={`font-medium ${color}`}>{prefix}{fmtQty(value)}</span>
}

/* ------------------------------------------------------------------ */
/*  Count Input Row                                                    */
/* ------------------------------------------------------------------ */

function CountInputRow({
  item,
  auditStatus,
  onSave,
}: {
  item: AuditItem
  auditStatus: string
  onSave: (itemId: string, quantity: number, notes: string) => Promise<void>
}) {
  const [qty, setQty] = useState(item.counted_quantity != null ? String(item.counted_quantity) : '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const isCountable = auditStatus === 'in_progress'

  const handleQtyChange = (val: string) => {
    setQty(val)
    setDirty(true)
  }

  const handleNotesChange = (val: string) => {
    setNotes(val)
    setDirty(true)
  }

  const handleSave = async () => {
    const parsed = parseFloat(qty)
    if (isNaN(parsed) || parsed < 0) return
    setSaving(true)
    await onSave(item.id, parsed, notes)
    setSaving(false)
    setDirty(false)
  }

  const product = item.products
  const invItem = item.inventory_items

  return (
    <tr className="border-b border-edge/50 hover:bg-raised/20 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-primary">{product?.name ?? 'Unknown Product'}</div>
        {product?.sku && (
          <div className="text-xs text-muted">SKU: {product.sku}</div>
        )}
      </td>
      <td className="px-4 py-3 text-secondary text-xs">
        {invItem?.barcode ?? '\u2014'}
      </td>
      <td className="px-4 py-3 text-secondary text-xs">
        {invItem?.rooms?.name ?? '\u2014'}
      </td>
      <td className="px-4 py-3 text-right font-mono text-secondary">
        {fmtQty(item.expected_quantity)}
      </td>
      <td className="px-4 py-3">
        {isCountable ? (
          <input
            type="number"
            min="0"
            step="any"
            value={qty}
            onChange={e => handleQtyChange(e.target.value)}
            className="w-24 bg-bg border border-edge rounded-lg px-2 py-1.5 text-sm text-right text-primary font-mono focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            placeholder="0"
          />
        ) : (
          <span className="font-mono text-secondary text-right block">
            {fmtQty(item.counted_quantity)}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <DiscrepancyCell value={
          item.counted_quantity != null
            ? item.counted_quantity - item.expected_quantity
            : (qty !== '' && !isNaN(parseFloat(qty)))
              ? parseFloat(qty) - item.expected_quantity
              : null
        } />
      </td>
      <td className="px-4 py-3">
        {isCountable ? (
          <input
            type="text"
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            className="w-full bg-bg border border-edge rounded-lg px-2 py-1.5 text-sm text-primary focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            placeholder="Notes..."
          />
        ) : (
          <span className="text-secondary text-xs">{item.notes ?? '\u2014'}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {isCountable && dirty && (
          <button
            onClick={handleSave}
            disabled={saving || qty === '' || isNaN(parseFloat(qty))}
            className="px-3 py-1.5 text-xs bg-accent hover:bg-accent text-primary rounded-lg font-medium transition-colors disabled:opacity-40"
          >
            {saving ? '...' : 'Save'}
          </button>
        )}
        {!isCountable && item.counted_quantity != null && item.employees && (
          <span className="text-xs text-muted">
            {item.employees.first_name} {item.employees.last_name}
          </span>
        )}
      </td>
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton Row                                                       */
/* ------------------------------------------------------------------ */

function SkeletonRow() {
  return (
    <tr className="border-b border-edge/50 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-raised rounded w-3/4" />
        </td>
      ))}
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { locationId, hydrated } = useSelectedLocation()

  const [audit, setAudit] = useState<Audit | null>(null)
  const [items, setItems] = useState<AuditItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  const fetchAudit = useCallback(async () => {
    const params = new URLSearchParams()
    if (locationId) params.set('location_id', locationId)
    const qs = params.toString()
    const res = await fetch(`/api/inventory/audits/${id}${qs ? `?${qs}` : ''}`)
    if (res.ok) {
      const data = await res.json()
      setAudit(data.audit)
    } else {
      setError('Failed to load audit')
    }
    setLoading(false)
  }, [id, locationId])

  const fetchItems = useCallback(async (page = 1, currentFilter?: string, currentSearch?: string) => {
    setItemsLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: '50',
      filter: currentFilter ?? filter,
    })
    if ((currentSearch ?? search).trim()) {
      params.set('search', (currentSearch ?? search).trim())
    }
    if (locationId) params.set('location_id', locationId)

    const res = await fetch(`/api/inventory/audits/${id}/items?${params}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data.items ?? [])
      setPagination(data.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 0 })
    }
    setItemsLoading(false)
  }, [id, filter, search, locationId])

  useEffect(() => {
    if (hydrated) void Promise.resolve().then(fetchAudit)
  }, [hydrated, fetchAudit])

  useEffect(() => {
    if (audit && audit.status !== 'draft') {
      void Promise.resolve().then(() => fetchItems(1))
    }
  }, [audit?.status, fetchItems]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter)
    fetchItems(1, newFilter, search)
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchItems(1, filter, val)
    }, 300)
  }

  const performAction = async (action: 'start' | 'review' | 'complete' | 'cancel') => {
    const confirmMessages: Record<string, string> = {
      start: 'Start this audit? This will populate items from current inventory.',
      review: 'Move this audit to review? Ensure all items have been counted.',
      complete: 'Finalize this audit? This cannot be undone.',
      cancel: 'Cancel this audit? This cannot be undone.',
    }

    if (!window.confirm(confirmMessages[action])) return

    setActionLoading(true)
    setError('')

    const res = await fetch(`/api/inventory/audits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Action failed' }))
      setError(data.error ?? 'Action failed')
      setActionLoading(false)
      return
    }

    setActionLoading(false)
    await fetchAudit()
    if (action === 'start') {
      await fetchItems(1)
    }
  }

  const handleSaveCount = async (itemId: string, countedQuantity: number, notes: string) => {
    const res = await fetch(`/api/inventory/audits/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, countedQuantity, notes: notes || undefined }),
    })

    if (res.ok) {
      const data = await res.json()
      setItems(prev => prev.map(i => i.id === itemId ? data.item : i))
      // Refresh audit summary
      fetchAudit()
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-raised rounded w-64" />
          <div className="h-4 bg-raised rounded w-96" />
          <div className="h-64 bg-surface rounded-xl" />
        </div>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="text-center py-12">
          <p className="text-secondary text-lg">Audit not found</p>
          <Link href="/inventory/audits" className="text-accent hover:text-accent text-sm mt-2 inline-block">
            Back to audits
          </Link>
        </div>
      </div>
    )
  }

  const progress = audit.summary.totalItems > 0
    ? Math.round((audit.summary.countedItems / audit.summary.totalItems) * 100)
    : 0

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/inventory/audits"
              className="text-secondary hover:text-primary text-sm transition-colors"
            >
              Audits
            </Link>
            <span className="text-muted">/</span>
            <h1 className="text-2xl font-bold text-primary">{audit.name}</h1>
            <StatusBadge status={audit.status} />
          </div>
          {audit.notes && (
            <p className="text-sm text-secondary mt-1">{audit.notes}</p>
          )}
        </div>

        <div className="flex gap-2">
          {audit.status === 'draft' && (
            <>
              <button
                onClick={() => performAction('start')}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-accent hover:bg-accent text-primary rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Starting...' : 'Start Audit'}
              </button>
              <button
                onClick={() => performAction('cancel')}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-raised hover:bg-raised text-primary rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
          {audit.status === 'in_progress' && (
            <>
              <button
                onClick={() => performAction('review')}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-info hover:bg-info text-primary rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Move to Review'}
              </button>
              <button
                onClick={() => performAction('cancel')}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-raised hover:bg-raised text-primary rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
          {audit.status === 'review' && (
            <>
              <button
                onClick={() => performAction('complete')}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-success hover:bg-success text-primary rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Finalizing...' : 'Complete Audit'}
              </button>
              <button
                onClick={() => performAction('cancel')}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-raised hover:bg-raised text-primary rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-danger/30 border border-danger text-danger px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-edge rounded-xl px-4 py-3">
          <div className="text-xs text-secondary mb-1">Location</div>
          <div className="text-sm font-medium text-primary">{audit.location?.name ?? '\u2014'}</div>
        </div>
        <div className="bg-surface border border-edge rounded-xl px-4 py-3">
          <div className="text-xs text-secondary mb-1">Scope: Rooms</div>
          <div className="text-sm text-primary">
            {audit.scope_room_names.length > 0 ? audit.scope_room_names.join(', ') : 'All Rooms'}
          </div>
        </div>
        <div className="bg-surface border border-edge rounded-xl px-4 py-3">
          <div className="text-xs text-secondary mb-1">Scope: Categories</div>
          <div className="text-sm text-primary">
            {audit.scope_category_names.length > 0 ? audit.scope_category_names.join(', ') : 'All Categories'}
          </div>
        </div>
        <div className="bg-surface border border-edge rounded-xl px-4 py-3">
          <div className="text-xs text-secondary mb-1">Created By</div>
          <div className="text-sm text-primary">
            {audit.created_by_employee
              ? `${audit.created_by_employee.first_name} ${audit.created_by_employee.last_name}`
              : '\u2014'}
          </div>
        </div>
      </div>

      {/* Dates Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-edge rounded-xl px-4 py-3">
          <div className="text-xs text-secondary mb-1">Created</div>
          <div className="text-sm text-primary">{fmtDate(audit.created_at)}</div>
        </div>
        <div className="bg-surface border border-edge rounded-xl px-4 py-3">
          <div className="text-xs text-secondary mb-1">Started</div>
          <div className="text-sm text-primary">{fmtDate(audit.started_at)}</div>
        </div>
        <div className="bg-surface border border-edge rounded-xl px-4 py-3">
          <div className="text-xs text-secondary mb-1">Completed</div>
          <div className="text-sm text-primary">{fmtDate(audit.completed_at)}</div>
        </div>
      </div>

      {/* Progress + Summary (only when items exist) */}
      {audit.status !== 'draft' && (
        <div className="bg-surface border border-edge rounded-xl px-6 py-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary">Count Progress</h3>
            <span className="text-sm text-secondary">
              {audit.summary.countedItems} / {audit.summary.totalItems} items counted ({progress}%)
            </span>
          </div>
          <div className="w-full bg-raised rounded-full h-2.5 mb-3">
            <div
              className="bg-accent h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-secondary">Total Items: </span>
              <span className="text-primary font-medium">{audit.summary.totalItems}</span>
            </div>
            <div>
              <span className="text-secondary">Counted: </span>
              <span className="text-accent font-medium">{audit.summary.countedItems}</span>
            </div>
            <div>
              <span className="text-secondary">Discrepancies: </span>
              <span className={audit.summary.discrepancyItems > 0 ? 'text-danger font-medium' : 'text-primary font-medium'}>
                {audit.summary.discrepancyItems}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Draft state: no items yet */}
      {audit.status === 'draft' && (
        <div className="bg-surface border border-edge rounded-xl p-12 text-center">
          <p className="text-secondary text-lg mb-2">This audit is in draft status</p>
          <p className="text-muted text-sm">
            Click &quot;Start Audit&quot; to populate inventory items and begin counting.
          </p>
        </div>
      )}

      {/* Items Table (non-draft) */}
      {audit.status !== 'draft' && (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-4">
            <select
              value={filter}
              onChange={e => handleFilterChange(e.target.value)}
              className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-accent outline-none"
            >
              <option value="all">All Items</option>
              <option value="counted">Counted</option>
              <option value="uncounted">Uncounted</option>
              <option value="discrepancy">Discrepancies</option>
            </select>
            <input
              type="text"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:ring-2 focus:ring-accent outline-none w-72"
            />
            <span className="text-xs text-muted ml-auto">
              {pagination.total} item{pagination.total !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="bg-surface border border-edge rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge text-secondary text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Product</th>
                    <th className="text-left px-4 py-3">Barcode</th>
                    <th className="text-left px-4 py-3">Room</th>
                    <th className="text-right px-4 py-3">Expected</th>
                    <th className="text-right px-4 py-3">Counted</th>
                    <th className="text-right px-4 py-3">Discrepancy</th>
                    <th className="text-left px-4 py-3">Notes</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {itemsLoading && items.length === 0 && (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  )}
                  {!itemsLoading && items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted">
                        No items found matching the current filter.
                      </td>
                    </tr>
                  )}
                  {items.map(item => (
                    <CountInputRow
                      key={item.id}
                      item={item}
                      auditStatus={audit.status}
                      onSave={handleSaveCount}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchItems(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-xs bg-raised hover:bg-raised text-primary rounded-lg disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchItems(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 text-xs bg-raised hover:bg-raised text-primary rounded-lg disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
