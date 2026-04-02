'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CustomerGroup {
  id: string
  name: string
  description: string | null
  is_active: boolean
  member_count: number
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Style constants                                                    */
/* ------------------------------------------------------------------ */

const inputCls =
  'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type SortKey = 'name' | 'member_count' | 'created_at'
type SortDir = 'asc' | 'desc'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CustomerGroupsPage() {
  const [groups, setGroups] = useState<CustomerGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null)

  /* Add-group modal state */
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving] = useState(false)

  /* ---- Fetch groups ---- */
  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/customer-groups', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  /* ---- Sort logic ---- */
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...groups].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'name') return a.name.localeCompare(b.name) * dir
    if (sortKey === 'member_count') return (a.member_count - b.member_count) * dir
    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
  })

  /* ---- Actions ---- */
  const handleDelete = async (id: string) => {
    setActionsOpenId(null)
    const res = await fetch(`/api/customer-groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
      cache: 'no-store',
    })
    if (res.ok) fetchGroups()
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/customer-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || null }),
        cache: 'no-store',
      })
      if (res.ok) {
        setShowModal(false)
        setNewName('')
        setNewDescription('')
        fetchGroups()
      }
    } finally {
      setSaving(false)
    }
  }

  /* ---- Sort indicator ---- */
  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="ml-1 text-gray-600">{'\u2195'}</span>
    return <span className="ml-1 text-emerald-400">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Customer Groups</h1>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
        >
          + Add Group
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th
                className="text-left px-4 py-3 cursor-pointer select-none"
                onClick={() => toggleSort('name')}
              >
                Group Name {sortIcon('name')}
              </th>
              <th
                className="text-right px-4 py-3 cursor-pointer select-none"
                onClick={() => toggleSort('member_count')}
              >
                Members {sortIcon('member_count')}
              </th>
              <th className="text-center px-4 py-3">Status</th>
              <th
                className="text-left px-4 py-3 cursor-pointer select-none"
                onClick={() => toggleSort('created_at')}
              >
                Created {sortIcon('created_at')}
              </th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No customer groups yet.
                </td>
              </tr>
            )}
            {!loading &&
              sorted.map(g => (
                <tr
                  key={g.id}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/groups/${g.id}`}
                      className="text-gray-50 hover:text-emerald-400 font-medium transition-colors"
                    >
                      {g.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{g.member_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        g.is_active
                          ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
                          : 'bg-red-900/50 text-red-400 border border-red-700'
                      }`}
                    >
                      {g.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(g.created_at)}</td>
                  <td className="px-4 py-3 text-right relative">
                    <button
                      onClick={() => setActionsOpenId(actionsOpenId === g.id ? null : g.id)}
                      className="text-gray-400 hover:text-gray-200 px-2 py-1 rounded transition-colors"
                    >
                      &#8943;
                    </button>
                    {actionsOpenId === g.id && (
                      <div className="absolute right-4 top-10 z-20 w-36 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden">
                        <Link
                          href={`/customers/groups/${g.id}`}
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                          onClick={() => setActionsOpenId(null)}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(g.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Group Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-50 mb-4">Add Customer Group</h2>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. VIP Customers"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className={inputCls + ' h-auto py-2'}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
