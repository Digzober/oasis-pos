'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Manifest {
  id: string
  title: string
  customer_name: string | null
  created_date: string
  completed_date: string | null
  status: string
  total_items: number
  type: string
  manifest_number: number | null
  subtotal: number
  credits: number
  discounts: number
  total: number
  taxes: number
}

interface LocationOption {
  id: string
  name: string
}

interface VendorOption {
  id: string
  name: string
}

type Tab = 'wholesale' | 'retail'
type SortField = 'title' | 'customer_name' | 'created_date' | 'completed_date' | 'status' | 'total_items' | 'type' | 'manifest_number' | 'subtotal' | 'credits' | 'discounts' | 'total' | 'taxes'
type SortDir = 'asc' | 'desc'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-info/20 text-info',
  open: 'bg-info/20 text-info',
  in_transit: 'bg-warning/20 text-warning',
  delivered: 'bg-accent/20 text-accent',
  sold: 'bg-accent/20 text-accent',
  cancelled: 'bg-danger/20 text-danger',
}

const STATUS_OPTIONS = ['draft', 'open', 'in_transit', 'delivered', 'sold', 'cancelled']

const PER_PAGE_OPTIONS = [25, 50, 100]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string | null): string {
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
/*  StatusBadge (local, spec-specific colors)                          */
/* ------------------------------------------------------------------ */

function ManifestStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-raised/20 text-secondary'
  return (
    <span className={`inline-flex items-center rounded-full text-[10px] font-medium px-2 py-0.5 capitalize ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Sort Header                                                        */
/* ------------------------------------------------------------------ */

function SortHeader({
  label,
  field,
  currentSort,
  currentDir,
  onSort,
  align = 'left',
}: {
  label: string
  field: SortField
  currentSort: SortField
  currentDir: SortDir
  onSort: (f: SortField) => void
  align?: 'left' | 'right'
}) {
  const active = currentSort === field
  const arrow = active ? (currentDir === 'asc' ? ' \u25B2' : ' \u25BC') : ''
  return (
    <th
      className={`${align === 'right' ? 'text-right' : 'text-left'} px-4 py-3 cursor-pointer select-none hover:text-primary transition-colors whitespace-nowrap ${active ? 'text-accent' : ''}`}
      onClick={() => onSort(field)}
    >
      {label}{arrow}
    </th>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton Row                                                       */
/* ------------------------------------------------------------------ */

function SkeletonRow() {
  return (
    <tr className="border-b border-edge/50 animate-pulse">
      {Array.from({ length: 14 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-raised rounded w-3/4" />
        </td>
      ))}
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/*  Row Menu (three dots)                                              */
/* ------------------------------------------------------------------ */

function RowMenu({ manifest, onDelete }: { manifest: Manifest; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isDraft = manifest.status === 'draft'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(o => !o) }}
        className="p-1 rounded hover:bg-raised text-secondary hover:text-primary"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-36 bg-surface border border-edge rounded-lg shadow-xl overflow-hidden">
          {isDraft ? (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(manifest.id); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-raised"
            >
              Delete
            </button>
          ) : (
            <div className="px-3 py-2 text-xs text-muted">No actions available</div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Status Filter Dropdown                                             */
/* ------------------------------------------------------------------ */

function StatusFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary min-w-[160px] text-left flex items-center justify-between gap-2"
      >
        <span className="truncate capitalize">
          {value ? value.replace(/_/g, ' ') : 'All statuses'}
        </span>
        <svg className="w-3 h-3 text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-48 bg-surface border border-edge rounded-lg shadow-xl overflow-hidden">
          {value && (
            <button
              onClick={() => { onChange(''); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs text-secondary hover:bg-raised border-b border-edge"
            >
              Clear status filter
            </button>
          )}
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-raised capitalize ${value === s ? 'text-accent' : 'text-primary'}`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Create Manifest Modal                                              */
/* ------------------------------------------------------------------ */

function CreateManifestModal({
  onClose,
  onCreate,
  locations,
  vendors,
}: {
  onClose: () => void
  onCreate: (data: { title: string; type: string; customer_id: string; date: string }) => Promise<void>
  locations: LocationOption[]
  vendors: VendorOption[]
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('transfer')
  const [customerId, setCustomerId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const customerOptions = type === 'transfer' ? locations : vendors
  const customerLabel = type === 'transfer' ? 'Destination Location' : 'Vendor'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    if (!customerId) { setError(`${customerLabel} is required`); return }
    if (!date) { setError('Date is required'); return }
    setError(null)
    setSubmitting(true)
    try {
      await onCreate({ title: title.trim(), type, customer_id: customerId, date })
    } catch {
      setError('Failed to create manifest')
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full bg-bg border border-edge-strong rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60">
      <div className="bg-surface border border-edge rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
          <h2 className="text-lg font-bold text-primary">Create Manifest</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary text-lg">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-danger/30 border border-danger rounded text-sm text-danger">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-secondary mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="e.g. sb1montgomery"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Type *</label>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value); setCustomerId('') }}
              className={inputCls}
            >
              <option value="transfer">Transfer</option>
              <option value="order">Order</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">{customerLabel} *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select {customerLabel.toLowerCase()}...</option>
              {customerOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-accent text-primary rounded-lg hover:bg-accent disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Manifest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ManifestsPage() {
  const router = useRouter()
  const { locationId, hydrated } = useSelectedLocation()
  const [manifests, setManifests] = useState<Manifest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(100)
  const [tab, setTab] = useState<Tab>('wholesale')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('created_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Fetch manifests */
  const fetchManifests = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      tab,
      page: String(page),
      per_page: String(perPage),
      sort_by: sortBy,
      sort_dir: sortDir,
    })
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    if (locationId) params.set('location_id', locationId)

    try {
      const res = await fetch(`/api/manifests?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        setError(data.error ?? 'Failed to load manifests')
        setManifests([])
        return
      }
      const data = await res.json()
      setManifests(data.manifests ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setError('Network error loading manifests')
      setManifests([])
    } finally {
      setLoading(false)
    }
  }, [tab, page, perPage, status, search, sortBy, sortDir, locationId])

  useEffect(() => { if (hydrated) fetchManifests() }, [hydrated, fetchManifests])

  /* Fetch lookup data for create modal */
  useEffect(() => {
    async function fetchLookups() {
      try {
        const [locRes, vendRes] = await Promise.all([
          fetch('/api/auth/locations'),
          fetch('/api/vendors'),
        ])
        if (locRes.ok) {
          const data = await locRes.json()
          setLocations(data.locations ?? data ?? [])
        }
        if (vendRes.ok) {
          const data = await vendRes.json()
          setVendors(data.vendors ?? data ?? [])
        }
      } catch {
        /* Lookups are non-critical for page load */
      }
    }
    fetchLookups()
  }, [])

  /* Handlers */
  function handleTabChange(newTab: Tab) {
    setTab(newTab)
    setPage(1)
  }

  function handleSearchChange(value: string) {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  function handlePerPageChange(newPerPage: number) {
    setPerPage(newPerPage)
    setPage(1)
  }

  async function handleCreate(data: { title: string; type: string; customer_id: string; date: string }) {
    const body: Record<string, string> = {
      title: data.title,
      type: data.type,
      date: data.date,
    }
    if (data.type === 'transfer') {
      body.destination_location_id = data.customer_id
    } else {
      body.vendor_id = data.customer_id
    }
    const res = await fetch('/api/manifests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create manifest' }))
      throw new Error(err.error ?? 'Failed to create manifest')
    }
    const result = await res.json()
    const manifestId = result.manifest?.id ?? result.id
    setShowCreate(false)
    router.push(`/inventory/manifests/${manifestId}`)
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/manifests/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setManifests(prev => prev.filter(m => m.id !== id))
        setTotal(prev => prev - 1)
      }
    } catch {
      /* Silently fail — user can retry */
    }
    setDeleteConfirm(null)
  }

  /* Pagination calculations */
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const displayStart = total === 0 ? 0 : (page - 1) * perPage + 1
  const displayEnd = Math.min(page * perPage, total)

  return (
    <div>
      <PageHeader
        title="Manifests"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm bg-accent text-primary rounded-lg hover:bg-accent transition-colors font-medium"
          >
            Add manifest
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-surface rounded-lg p-1 w-fit border border-edge">
        <TabButton label="Wholesale" active={tab === 'wholesale'} onClick={() => handleTabChange('wholesale')} />
        <TabButton label="Retail" active={tab === 'retail'} onClick={() => handleTabChange('retail')} />
      </div>

      {/* Search + Status Filter */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          defaultValue={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by title or customer..."
          className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary w-80 placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
        />
        <StatusFilter value={status} onChange={(v) => { setStatus(v); setPage(1) }} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-danger/30 border border-danger rounded-lg text-sm text-danger">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1400px]">
            <thead>
              <tr className="border-b border-edge text-secondary text-xs uppercase">
                <SortHeader label="Title" field="title" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Customer" field="customer_name" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Created Date" field="created_date" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Completed Date" field="completed_date" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Status" field="status" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Total Items" field="total_items" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Type" field="type" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                <SortHeader label="Receipt #" field="manifest_number" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Subtotal" field="subtotal" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Credits" field="credits" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Discounts" field="discounts" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Total" field="total" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="Taxes" field="taxes" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : manifests.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-muted">
                    No manifests found
                  </td>
                </tr>
              ) : manifests.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-edge/50 hover:bg-raised/30 transition-colors"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/inventory/manifests/${m.id}`}
                      className="text-accent hover:text-accent hover:underline font-medium"
                    >
                      {m.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-secondary">{m.customer_name ?? '\u2014'}</td>
                  <td className="px-4 py-2.5 text-secondary text-xs whitespace-nowrap">{formatDate(m.created_date)}</td>
                  <td className="px-4 py-2.5 text-secondary text-xs whitespace-nowrap">{formatDate(m.completed_date)}</td>
                  <td className="px-4 py-2.5"><ManifestStatusBadge status={m.status} /></td>
                  <td className="px-4 py-2.5 text-right text-primary tabular-nums">{m.total_items}</td>
                  <td className="px-4 py-2.5 text-secondary capitalize">{m.type}</td>
                  <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{m.manifest_number ?? '\u2014'}</td>
                  <td className="px-4 py-2.5 text-right text-primary tabular-nums">{formatCurrency(m.subtotal)}</td>
                  <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{formatCurrency(m.credits)}</td>
                  <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{formatCurrency(m.discounts)}</td>
                  <td className="px-4 py-2.5 text-right text-primary tabular-nums font-medium">{formatCurrency(m.total)}</td>
                  <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{formatCurrency(m.taxes)}</td>
                  <td className="px-4 py-2.5">
                    <RowMenu manifest={m} onDelete={(id) => setDeleteConfirm(id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-edge">
          <div className="flex items-center gap-3">
            <span className="text-xs text-secondary">
              Displaying {displayStart} - {displayEnd} of {total}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted">Per page:</span>
              <select
                value={perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                className="bg-bg border border-edge rounded px-2 py-1 text-xs text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {PER_PAGE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs bg-raised text-secondary rounded disabled:opacity-40 hover:bg-raised transition-colors"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-xs text-secondary tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-xs bg-raised text-secondary rounded disabled:opacity-40 hover:bg-raised transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateManifestModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          locations={locations}
          vendors={vendors}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60">
          <div className="bg-surface border border-edge rounded-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-primary mb-2">Delete Manifest</h3>
            <p className="text-sm text-secondary mb-6">
              Are you sure you want to delete this draft manifest? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm bg-danger text-primary rounded-lg hover:bg-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab Button                                                         */
/* ------------------------------------------------------------------ */

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
        active
          ? 'bg-accent text-primary'
          : 'text-secondary hover:text-primary hover:bg-raised'
      }`}
    >
      {label}
    </button>
  )
}
