'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const inputCls = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'
const labelCls = 'block text-xs font-medium text-secondary uppercase mb-1'

/* ---------- Types ---------- */

interface Badge {
  id: string
  name: string
  color: string
  icon: string | null
  member_count: number
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
  { label: 'Fields', href: '/customers/configure/fields' },
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
                : 'text-secondary border-transparent hover:text-primary'
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
}

const EMPTY_FORM: BadgeForm = {
  name: '',
  color: '#10b981',
  icon: '',
}

/* ---------- Page ---------- */

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

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
    })
    setMembers([])
    setCustomerSearch('')
    setCustomerResults([])
    fetchMembers(badge.id)
  }

  async function handleSaveEdit() {
    if (!editingBadge) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: editForm.name,
        color: editForm.color,
        icon: editForm.icon || null,
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
              className="w-10 h-10 rounded-lg border border-edge-strong bg-bg cursor-pointer p-0.5"
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

      </div>
    )
  }

  /* ---------- Main render ---------- */

  return (
    <div className="min-h-screen bg-bg p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">Customer Configuration</h1>
      <ConfigureTabs />

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-primary">Badges</h2>
        <button
          onClick={openCreate}
          className="h-10 px-4 bg-accent hover:bg-accent text-primary text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          + Create Badge
        </button>
      </div>

      {/* Badge grid */}
      {loading ? (
        <div className="text-secondary text-sm py-8 text-center">Loading badges...</div>
      ) : badges.length === 0 ? (
        <div className="bg-surface border border-edge rounded-lg p-8 text-center">
          <p className="text-secondary text-sm">No badges created yet. Click &quot;+ Create Badge&quot; to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="bg-surface border border-edge rounded-lg p-4 flex flex-col gap-3"
            >
              {/* Badge name + color dot */}
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: badge.color || 'var(--text-muted)' }}
                />
                <span className="text-base font-semibold text-primary truncate">
                  {badge.icon ? `${badge.icon} ` : ''}{badge.name}
                </span>
              </div>

              {/* Member count */}
              <p className="text-xs text-secondary">
                {badge.member_count} {badge.member_count === 1 ? 'member' : 'members'}
              </p>

              <div className="flex items-center justify-end">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(badge)}
                    className="px-3 py-1 text-xs text-secondary bg-raised hover:bg-raised rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(badge)}
                    className="px-3 py-1 text-xs text-danger bg-raised hover:bg-raised rounded-lg transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60">
          <div className="bg-surface border border-edge rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-primary mb-4">Create Badge</h2>
            {renderFormFields(createForm, setCreateForm)}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-secondary bg-raised hover:bg-raised rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.name}
                className="px-4 py-2 text-sm text-primary bg-accent hover:bg-accent rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Badge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Edit Badge Modal ==================== */}
      {editingBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60">
          <div className="bg-surface border border-edge rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-primary mb-4">Edit Badge</h2>
            {renderFormFields(editForm, setEditForm)}

            {/* Members section */}
            {(
              <div className="mt-6 border-t border-edge pt-4">
                <h3 className="text-sm font-semibold text-primary mb-3">Members</h3>

                {/* Add customer search */}
                <div className="mb-3 relative">
                  <input
                    className={inputCls}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customers to add..."
                  />
                  {searchingCustomers && (
                    <div className="absolute right-3 top-2.5 text-xs text-secondary">Searching...</div>
                  )}
                  {customerResults.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-bg border border-edge-strong rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {customerResults.map((cust) => {
                        const alreadyMember = members.some((m) => m.customer_id === cust.id)
                        return (
                          <button
                            key={cust.id}
                            disabled={alreadyMember || addingMember === cust.id}
                            onClick={() => addMember(cust.id)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-surface transition-colors flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <span className="text-primary">
                              {cust.first_name} {cust.last_name}
                              {cust.email && (
                                <span className="text-muted ml-2">{cust.email}</span>
                              )}
                            </span>
                            {alreadyMember ? (
                              <span className="text-xs text-muted">Added</span>
                            ) : addingMember === cust.id ? (
                              <span className="text-xs text-secondary">Adding...</span>
                            ) : (
                              <span className="text-xs text-accent">+ Add</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Members list */}
                {membersLoading ? (
                  <div className="text-xs text-secondary py-4 text-center">Loading members...</div>
                ) : members.length === 0 ? (
                  <div className="text-xs text-secondary py-4 text-center">No members assigned yet.</div>
                ) : (
                  <div className="bg-bg border border-edge rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="border-b border-edge">
                        <tr>
                          <th className="px-3 py-2 text-xs font-medium text-secondary uppercase">Name</th>
                          <th className="px-3 py-2 text-xs font-medium text-secondary uppercase">Email</th>
                          <th className="px-3 py-2 w-12" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-edge">
                        {members.map((member) => (
                          <tr key={member.id} className="hover:bg-surface">
                            <td className="px-3 py-2 text-primary">
                              {member.first_name} {member.last_name}
                            </td>
                            <td className="px-3 py-2 text-secondary">{member.email ?? '-'}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => removeMember(member.id)}
                                disabled={removingMember === member.id}
                                className="text-danger hover:text-danger text-sm font-medium disabled:opacity-40"
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
                className="px-4 py-2 text-sm text-secondary bg-raised hover:bg-raised rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.name}
                className="px-4 py-2 text-sm text-primary bg-accent hover:bg-accent rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Delete Confirmation Modal ==================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60">
          <div className="bg-surface border border-edge rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-primary mb-2">Delete Badge</h2>
            <p className="text-sm text-secondary mb-6">
              Are you sure you want to delete{' '}
              <span className="text-primary font-medium">{deleteTarget.name}</span>?
              This action cannot be undone.
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
