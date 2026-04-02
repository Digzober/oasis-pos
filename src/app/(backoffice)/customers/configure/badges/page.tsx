'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'

/* ---------- Types ---------- */

interface Badge {
  id: string
  name: string
  color: string
  icon: string | null
  description: string | null
  assignment_method: 'manual' | 'automatic'
  segment_id: string | null
  segment_name: string | null
  show_in_register: boolean
  member_count: number
}

interface Segment {
  id: string
  name: string
}

interface CustomerResult {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

interface BadgeMember {
  id: string
  customer_id: string
  first_name: string
  last_name: string
  email: string | null
}

/* ---------- Tabs ---------- */

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
    <nav className="flex gap-6 border-b border-gray-700 mb-6">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

/* ---------- Empty form ---------- */

interface BadgeForm {
  name: string
  color: string
  icon: string
  description: string
  assignment_method: 'manual' | 'automatic'
  segment_id: string
  show_in_register: boolean
}

const EMPTY_FORM: BadgeForm = {
  name: '',
  color: '#10b981',
  icon: '',
  description: '',
  assignment_method: 'manual',
  segment_id: '',
  show_in_register: true,
}

/* ---------- Page ---------- */

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [segments, setSegments] = useState<Segment[]>([])

  /* Create modal */
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<BadgeForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)

  /* Edit modal */
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null)
  const [editForm, setEditForm] = useState<BadgeForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  /* Edit modal — members */
  const [members, setMembers] = useState<BadgeMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [addingMember, setAddingMember] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<string | null>(null)

  /* Delete confirmation */
  const [deleteTarget, setDeleteTarget] = useState<Badge | null>(null)
  const [deleting, setDeleting] = useState(false)

  /* ---------- Fetch badges ---------- */

  const fetchBadges = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/badges', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setBadges(json.badges ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBadges() }, [fetchBadges])

  /* ---------- Fetch segments (for dropdowns) ---------- */

  useEffect(() => {
    async function loadSegments() {
      try {
        const res = await fetch('/api/segments', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          setSegments(json.segments ?? [])
        }
      } catch {
        /* segments not available */
      }
    }
    loadSegments()
  }, [])

  /* ---------- Fetch members for edit modal ---------- */

  const fetchMembers = useCallback(async (badgeId: string) => {
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/badges/${badgeId}`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setMembers(json.members ?? [])
      }
    } finally {
      setMembersLoading(false)
    }
  }, [])

  /* ---------- Customer search ---------- */

  useEffect(() => {
    if (customerSearch.length < 2) {
      setCustomerResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setSearchingCustomers(true)
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(customerSearch)}`, { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          setCustomerResults(json.customers ?? [])
        }
      } finally {
        setSearchingCustomers(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [customerSearch])

  /* ---------- Toggle show_in_register ---------- */

  async function toggleRegister(badge: Badge) {
    const res = await fetch(`/api/badges/${badge.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_in_register: !badge.show_in_register }),
      cache: 'no-store',
    })
    if (res.ok) {
      setBadges((prev) =>
        prev.map((b) => (b.id === badge.id ? { ...b, show_in_register: !b.show_in_register } : b)),
      )
    }
  }

  /* ---------- Create ---------- */

  function openCreate() {
    setCreateForm(EMPTY_FORM)
    setShowCreate(true)
  }

  async function handleCreate() {
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        name: createForm.name,
        color: createForm.color,
        icon: createForm.icon || null,
        description: createForm.description || null,
        assignment_method: createForm.assignment_method,
        segment_id: createForm.assignment_method === 'automatic' ? createForm.segment_id || null : null,
        show_in_register: createForm.show_in_register,
      }
      const res = await fetch('/api/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      if (res.ok) {
        setShowCreate(false)
        fetchBadges()
      }
    } finally {
      setCreating(false)
    }
  }

  /* ---------- Edit ---------- */

  function openEdit(badge: Badge) {
    setEditingBadge(badge)
    setEditForm({
      name: badge.name,
      color: badge.color,
      icon: badge.icon ?? '',
      description: badge.description ?? '',
      assignment_method: badge.assignment_method,
      segment_id: badge.segment_id ?? '',
      show_in_register: badge.show_in_register,
    })
    setMembers([])
    setCustomerSearch('')
    setCustomerResults([])
    if (badge.assignment_method === 'manual') {
      fetchMembers(badge.id)
    }
  }

  async function handleSaveEdit() {
    if (!editingBadge) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: editForm.name,
        color: editForm.color,
        icon: editForm.icon || null,
        description: editForm.description || null,
        assignment_method: editForm.assignment_method,
        segment_id: editForm.assignment_method === 'automatic' ? editForm.segment_id || null : null,
        show_in_register: editForm.show_in_register,
      }
      const res = await fetch(`/api/badges/${editingBadge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      if (res.ok) {
        setEditingBadge(null)
        fetchBadges()
      }
    } finally {
      setSaving(false)
    }
  }

  /* ---------- Members (add / remove) ---------- */

  async function addMember(customerId: string) {
    if (!editingBadge) return
    setAddingMember(customerId)
    try {
      const res = await fetch(`/api/badges/${editingBadge.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId }),
        cache: 'no-store',
      })
      if (res.ok) {
        fetchMembers(editingBadge.id)
        setCustomerSearch('')
        setCustomerResults([])
      }
    } finally {
      setAddingMember(null)
    }
  }

  async function removeMember(memberId: string) {
    if (!editingBadge) return
    setRemovingMember(memberId)
    try {
      const res = await fetch(`/api/badges/${editingBadge.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId }),
        cache: 'no-store',
      })
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
      }
    } finally {
      setRemovingMember(null)
    }
  }

  /* ---------- Delete ---------- */

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/badges/${deleteTarget.id}`, {
        method: 'DELETE',
        cache: 'no-store',
      })
      if (res.ok) {
        setDeleteTarget(null)
        fetchBadges()
      }
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- Render helpers ---------- */

  function renderFormFields(form: BadgeForm, setForm: (f: BadgeForm) => void) {
    return (
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className={labelCls}>Name *</label>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. VIP, First-Timer, Staff Pick"
          />
        </div>

        {/* Color */}
        <div>
          <label className={labelCls}>Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-10 h-10 rounded-lg border border-gray-600 bg-gray-900 cursor-pointer p-0.5"
            />
            <input
              className={inputCls}
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="#10b981"
            />
          </div>
        </div>

        {/* Icon */}
        <div>
          <label className={labelCls}>Icon (optional)</label>
          <input
            className={inputCls}
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            placeholder="Emoji or icon name"
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>Description (optional)</label>
          <textarea
            className={`${inputCls} h-20 py-2 resize-none`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of this badge"
          />
        </div>

        {/* Assignment Method */}
        <div>
          <label className={labelCls}>Assignment Method</label>
          <div className="flex items-center gap-6 mt-1">
            <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
              <input
                type="radio"
                name="assignment_method"
                value="manual"
                checked={form.assignment_method === 'manual'}
                onChange={() => setForm({ ...form, assignment_method: 'manual', segment_id: '' })}
                className="accent-emerald-500"
              />
              Manual
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
              <input
                type="radio"
                name="assignment_method"
                value="automatic"
                checked={form.assignment_method === 'automatic'}
                onChange={() => setForm({ ...form, assignment_method: 'automatic' })}
                className="accent-emerald-500"
              />
              Automatic
            </label>
          </div>
        </div>

        {/* Segment dropdown (automatic only) */}
        {form.assignment_method === 'automatic' && (
          <div>
            <label className={labelCls}>Linked Segment</label>
            <select
              className={inputCls}
              value={form.segment_id}
              onChange={(e) => setForm({ ...form, segment_id: e.target.value })}
            >
              <option value="">Select a segment...</option>
              {segments.map((seg) => (
                <option key={seg.id} value={seg.id}>
                  {seg.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Show in Register */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.show_in_register}
              onChange={(e) => setForm({ ...form, show_in_register: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-900 accent-emerald-500"
            />
            <span className="text-sm text-gray-200">Show in Register</span>
          </label>
        </div>
      </div>
    )
  }

  /* ---------- Main render ---------- */

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h1 className="text-2xl font-bold text-gray-50 mb-6">Customer Configuration</h1>
      <ConfigureTabs />

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-50">Badges</h2>
        <button
          onClick={openCreate}
          className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          + Create Badge
        </button>
      </div>

      {/* Badge grid */}
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading badges...</div>
      ) : badges.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-sm">No badges created yet. Click &quot;+ Create Badge&quot; to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col gap-3"
            >
              {/* Badge name + color dot */}
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: badge.color || '#6b7280' }}
                />
                <span className="text-base font-semibold text-gray-50 truncate">
                  {badge.icon ? `${badge.icon} ` : ''}{badge.name}
                </span>
              </div>

              {/* Description */}
              {badge.description && (
                <p className="text-xs text-gray-400 line-clamp-2">{badge.description}</p>
              )}

              {/* Assignment method pill + segment */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    badge.assignment_method === 'automatic'
                      ? 'bg-blue-900/50 text-blue-400'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {badge.assignment_method === 'automatic' ? 'Automatic' : 'Manual'}
                </span>
                {badge.assignment_method === 'automatic' && badge.segment_name && (
                  <span className="text-xs text-gray-400 truncate">
                    {badge.segment_name}
                  </span>
                )}
              </div>

              {/* Member count */}
              <p className="text-xs text-gray-400">
                {badge.member_count} {badge.member_count === 1 ? 'member' : 'members'}
              </p>

              {/* Show in register toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={badge.show_in_register}
                    onClick={() => toggleRegister(badge)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      badge.show_in_register ? 'bg-emerald-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        badge.show_in_register ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-gray-400">Register</span>
                </label>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(badge)}
                    className="px-3 py-1 text-xs text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(badge)}
                    className="px-3 py-1 text-xs text-red-400 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== Create Badge Modal ==================== */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-50 mb-4">Create Badge</h2>
            {renderFormFields(createForm, setCreateForm)}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.name}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Badge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Edit Badge Modal ==================== */}
      {editingBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-50 mb-4">Edit Badge</h2>
            {renderFormFields(editForm, setEditForm)}

            {/* Members section (manual badges only) */}
            {editForm.assignment_method === 'manual' && (
              <div className="mt-6 border-t border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-gray-50 mb-3">Members</h3>

                {/* Add customer search */}
                <div className="mb-3 relative">
                  <input
                    className={inputCls}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customers to add..."
                  />
                  {searchingCustomers && (
                    <div className="absolute right-3 top-2.5 text-xs text-gray-400">Searching...</div>
                  )}
                  {customerResults.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {customerResults.map((cust) => {
                        const alreadyMember = members.some((m) => m.customer_id === cust.id)
                        return (
                          <button
                            key={cust.id}
                            disabled={alreadyMember || addingMember === cust.id}
                            onClick={() => addMember(cust.id)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <span className="text-gray-200">
                              {cust.first_name} {cust.last_name}
                              {cust.email && (
                                <span className="text-gray-500 ml-2">{cust.email}</span>
                              )}
                            </span>
                            {alreadyMember ? (
                              <span className="text-xs text-gray-500">Added</span>
                            ) : addingMember === cust.id ? (
                              <span className="text-xs text-gray-400">Adding...</span>
                            ) : (
                              <span className="text-xs text-emerald-400">+ Add</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Members list */}
                {membersLoading ? (
                  <div className="text-xs text-gray-400 py-4 text-center">Loading members...</div>
                ) : members.length === 0 ? (
                  <div className="text-xs text-gray-400 py-4 text-center">No members assigned yet.</div>
                ) : (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="border-b border-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-xs font-medium text-gray-400 uppercase">Name</th>
                          <th className="px-3 py-2 text-xs font-medium text-gray-400 uppercase">Email</th>
                          <th className="px-3 py-2 w-12" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {members.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-800">
                            <td className="px-3 py-2 text-gray-200">
                              {member.first_name} {member.last_name}
                            </td>
                            <td className="px-3 py-2 text-gray-400">{member.email ?? '-'}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => removeMember(member.id)}
                                disabled={removingMember === member.id}
                                className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-40"
                                title="Remove member"
                              >
                                {removingMember === member.id ? '...' : 'X'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingBadge(null)}
                className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.name}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Delete Confirmation Modal ==================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-gray-50 mb-2">Delete Badge</h2>
            <p className="text-sm text-gray-300 mb-6">
              Are you sure you want to delete{' '}
              <span className="text-gray-50 font-medium">{deleteTarget.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-40"
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
