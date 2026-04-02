'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
}

interface LookupOption {
  id: string
  name: string
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
  draft: 'bg-gray-600 text-gray-100',
  in_progress: 'bg-yellow-600 text-yellow-100',
  review: 'bg-blue-600 text-blue-100',
  completed: 'bg-green-600 text-green-100',
  cancelled: 'bg-red-600 text-red-100',
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
    <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-600 text-gray-100'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
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
/*  Date Formatter                                                     */
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

/* ------------------------------------------------------------------ */
/*  Create Audit Modal                                                 */
/* ------------------------------------------------------------------ */

function CreateAuditModal({
  open,
  onClose,
  onCreated,
  rooms,
  categories,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  rooms: LookupOption[]
  categories: LookupOption[]
}) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Audit name is required')
      return
    }
    setSaving(true)
    setError('')

    const res = await fetch('/api/inventory/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        notes: notes.trim() || undefined,
        scopeRooms: selectedRooms.length > 0 ? selectedRooms : undefined,
        scopeCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to create audit' }))
      setError(data.error ?? 'Failed to create audit')
      setSaving(false)
      return
    }

    setSaving(false)
    setName('')
    setNotes('')
    setSelectedRooms([])
    setSelectedCategories([])
    onCreated()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-50">Create Inventory Audit</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Q1 2026 Cycle Count"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes about this audit..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Scope: Rooms</label>
            <p className="text-xs text-gray-500 mb-2">Leave empty to include all rooms</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {rooms.map(room => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() =>
                    setSelectedRooms(prev =>
                      prev.includes(room.id) ? prev.filter(r => r !== room.id) : [...prev, room.id]
                    )
                  }
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedRooms.includes(room.id)
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {room.name}
                </button>
              ))}
              {rooms.length === 0 && (
                <p className="text-xs text-gray-500">No rooms available</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Scope: Categories</label>
            <p className="text-xs text-gray-500 mb-2">Leave empty to include all categories</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategories(prev =>
                      prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
                    )
                  }
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedCategories.includes(cat.id)
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-gray-500">No categories available</p>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-300 hover:text-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Audit'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function AuditsListPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [audits, setAudits] = useState<Audit[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [rooms, setRooms] = useState<LookupOption[]>([])
  const [categories, setCategories] = useState<LookupOption[]>([])
  const lookupsLoaded = useRef(false)

  const fetchAudits = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '25' })
    if (statusFilter) params.set('status', statusFilter)
    if (locationId) params.set('location_id', locationId)

    const res = await fetch(`/api/inventory/audits?${params}`)
    if (res.ok) {
      const data = await res.json()
      setAudits(data.audits ?? [])
      setPagination(data.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 0 })
    }
    setLoading(false)
  }, [statusFilter, locationId])

  useEffect(() => {
    if (hydrated) fetchAudits(1)
  }, [hydrated, fetchAudits])

  useEffect(() => {
    if (lookupsLoaded.current) return
    lookupsLoaded.current = true

    const loadLookups = async () => {
      const [roomsRes, catsRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/products/categories?flat=true'),
      ])
      if (roomsRes.ok) {
        const data = await roomsRes.json()
        setRooms((data.rooms ?? data).map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })))
      }
      if (catsRes.ok) {
        const data = await catsRes.json()
        const list = data.categories ?? data
        setCategories(Array.isArray(list) ? list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : [])
      }
    }
    loadLookups()
  }, [])

  const statusOptions = ['', 'draft', 'in_progress', 'review', 'completed', 'cancelled']

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-50">Inventory Audits</h1>
          <p className="text-sm text-gray-400 mt-1">Cycle counts and inventory verification</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Create Audit
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          {statusOptions.map(opt => (
            <option key={opt} value={opt}>
              {opt === '' ? 'All Statuses' : STATUS_LABELS[opt] ?? opt}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500">
          {pagination.total} audit{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">Rooms</th>
                <th className="text-left px-4 py-3">Categories</th>
                <th className="text-left px-4 py-3">Created By</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Started</th>
                <th className="text-left px-4 py-3">Completed</th>
              </tr>
            </thead>
            <tbody>
              {loading && audits.length === 0 && (
                <>
                  <SkeletonRow cols={9} />
                  <SkeletonRow cols={9} />
                  <SkeletonRow cols={9} />
                  <SkeletonRow cols={9} />
                  <SkeletonRow cols={9} />
                </>
              )}
              {!loading && audits.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    No audits found. Create one to get started.
                  </td>
                </tr>
              )}
              {audits.map(audit => (
                <tr
                  key={audit.id}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/inventory/audits/${audit.id}`}
                      className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      {audit.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={audit.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {audit.location?.name ?? '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {audit.scope_room_names.length > 0
                      ? audit.scope_room_names.join(', ')
                      : 'All'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {audit.scope_category_names.length > 0
                      ? audit.scope_category_names.join(', ')
                      : 'All'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {audit.created_by_employee
                      ? `${audit.created_by_employee.first_name} ${audit.created_by_employee.last_name}`
                      : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {fmtDate(audit.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {fmtDate(audit.started_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {fmtDate(audit.completed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchAudits(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => fetchAudits(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateAuditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => fetchAudits(1)}
        rooms={rooms}
        categories={categories}
      />
    </div>
  )
}
