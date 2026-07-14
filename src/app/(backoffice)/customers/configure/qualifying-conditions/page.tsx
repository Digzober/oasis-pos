'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DENSE_BESPOKE_TABLE_CLASS } from '@/lib/constants/tableDensity'

const inputCls = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'
const labelCls = 'block text-xs font-medium text-secondary uppercase mb-1'

interface Condition {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

interface ConditionsResponse {
  conditions: Condition[]
  pagination: { page: number; per_page: number; total: number; total_pages: number }
}

const TABS = [
  { label: 'Doctors', href: '/customers/configure/doctors' },
  { label: 'Qualifying Conditions', href: '/customers/configure/qualifying-conditions' },
  { label: 'Fields', href: '/customers/configure/fields' },
  { label: 'Badge Priority', href: '/customers/configure/badge-priority' },
  { label: 'Badges', href: '/customers/configure/badges' },
]

function ConfigureTabs() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-6 border-b border-edge mb-6">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-accent border-b-2 border-accent'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

const EMPTY_FORM = { name: '', description: '' }

export default function QualifyingConditionsPage() {
  const [conditions, setConditions] = useState<Condition[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingCondition, setEditingCondition] = useState<Condition | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Condition | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [openActions, setOpenActions] = useState<string | null>(null)

  const fetchConditions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
      if (search) params.set('search', search)
      const res = await fetch(`/api/customers/configure/qualifying-conditions?${params}`, { cache: 'no-store' })
      if (res.ok) {
        const json: ConditionsResponse = await res.json()
        setConditions(json.conditions ?? [])
        setTotal(json.pagination?.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search])

  useEffect(() => { fetchConditions() }, [fetchConditions])

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  function openAdd() {
    setEditingCondition(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(cond: Condition) {
    setEditingCondition(cond)
    setForm({
      name: cond.name,
      description: cond.description ?? '',
    })
    setShowModal(true)
    setOpenActions(null)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const url = editingCondition
        ? `/api/customers/configure/qualifying-conditions/${editingCondition.id}`
        : '/api/customers/configure/qualifying-conditions'
      const method = editingCondition ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        cache: 'no-store',
      })
      if (res.ok) {
        setShowModal(false)
        fetchConditions()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/customers/configure/qualifying-conditions/${deleteTarget.id}`, {
        method: 'DELETE',
        cache: 'no-store',
      })
      if (res.ok) {
        setDeleteTarget(null)
        fetchConditions()
      }
    } finally {
      setDeleting(false)
    }
  }

  function truncate(text: string | null, max: number): string {
    if (!text) return '-'
    return text.length > max ? text.slice(0, max) + '...' : text
  }

  return (
    <div className="min-h-screen bg-bg p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">Customer Configuration</h1>
      <ConfigureTabs />

      {/* Search + Add */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search conditions..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className={`${inputCls} max-w-sm`}
        />
        <button
          onClick={openAdd}
          className="h-10 px-4 bg-accent hover:bg-accent text-primary text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Add Condition
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface border border-edge rounded-lg overflow-hidden">
              <table data-density="compact" className={`${DENSE_BESPOKE_TABLE_CLASS} w-full text-left`}>
          <thead className="bg-surface border-b border-edge">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-secondary uppercase">Condition Name</th>
              <th className="px-4 py-3 text-xs font-medium text-secondary uppercase">Description</th>
              <th className="px-4 py-3 text-xs font-medium text-secondary uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-secondary uppercase w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-secondary">Loading...</td>
              </tr>
            ) : conditions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-secondary">No qualifying conditions found.</td>
              </tr>
            ) : (
              conditions.map((cond) => (
                <tr key={cond.id} className="hover:bg-raised">
                  <td className="px-4 py-3 text-primary">{cond.name}</td>
                  <td className="px-4 py-3 text-secondary">{truncate(cond.description, 80)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      cond.is_active
                        ? 'bg-accent/50 text-accent'
                        : 'bg-danger/50 text-danger'
                    }`}>
                      {cond.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setOpenActions(openActions === cond.id ? null : cond.id)}
                      className="text-secondary hover:text-primary text-lg leading-none px-2"
                    >
                      ...
                    </button>
                    {openActions === cond.id && (
                      <div className="absolute right-4 top-10 z-10 bg-surface border border-edge rounded-lg shadow-lg py-1 min-w-[120px]">
                        <button
                          onClick={() => openEdit(cond)}
                          className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-raised"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(cond); setOpenActions(null) }}
                          className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-raised"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-secondary">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm bg-surface border border-edge rounded-lg text-secondary hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm bg-surface border border-edge rounded-lg text-secondary hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60">
          <div className="bg-surface border border-edge rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-primary mb-4">
              {editingCondition ? 'Edit Condition' : 'Add Condition'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name</label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  className={`${inputCls} h-24 py-2 resize-none`}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-secondary bg-raised hover:bg-raised rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="px-4 py-2 text-sm text-primary bg-accent hover:bg-accent rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60">
          <div className="bg-surface border border-edge rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-primary mb-2">Delete Condition</h2>
            <p className="text-sm text-secondary mb-6">
              Are you sure you want to delete{' '}
              <span className="text-primary font-medium">{deleteTarget.name}</span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-secondary bg-raised hover:bg-raised rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-primary bg-danger hover:bg-danger rounded-lg transition-colors disabled:opacity-40"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
