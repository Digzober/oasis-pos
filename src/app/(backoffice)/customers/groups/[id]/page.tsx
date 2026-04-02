'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GroupDetail {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

interface GroupMember {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  customer_type: string
  joined_at: string
}

interface CustomerSearchResult {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  customer_type: string
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

function fullName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(' ') || 'Unnamed'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function typeBadgeCls(type: string): string {
  if (type === 'medical') return 'bg-blue-900/50 text-blue-400 border border-blue-700'
  if (type === 'recreational') return 'bg-purple-900/50 text-purple-400 border border-purple-700'
  return 'bg-gray-700 text-gray-300 border border-gray-600'
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CustomerGroupDetailPage() {
  const params = useParams()
  const groupId = params.id as string

  /* Group info state */
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)

  /* Editable fields */
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [savingInfo, setSavingInfo] = useState(false)

  /* Add member search state */
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  /* ---- Fetch group detail ---- */
  const fetchGroup = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customer-groups/${groupId}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const g = data.group as GroupDetail
        setGroup(g)
        setMembers(data.members ?? [])
        setEditName(g.name)
        setEditDescription(g.description ?? '')
        setEditActive(g.is_active)
      }
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    fetchGroup()
  }, [fetchGroup])

  /* ---- Save group info ---- */
  const handleSaveInfo = async () => {
    if (!editName.trim()) return
    setSavingInfo(true)
    try {
      const res = await fetch(`/api/customer-groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          is_active: editActive,
        }),
        cache: 'no-store',
      })
      if (res.ok) fetchGroup()
    } finally {
      setSavingInfo(false)
    }
  }

  /* ---- Remove member ---- */
  const handleRemoveMember = async (customerId: string) => {
    const res = await fetch(`/api/customer-groups/${groupId}/members/bulk`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_ids: [customerId] }),
      cache: 'no-store',
    })
    if (res.ok) fetchGroup()
  }

  /* ---- Search customers ---- */
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `/api/customers?q=${encodeURIComponent(searchQuery.trim())}`,
        { cache: 'no-store' },
      )
      if (res.ok) {
        const data = await res.json()
        const customers = data.customers ?? data.data ?? []
        const memberIds = new Set(members.map(m => m.id))
        setSearchResults(customers.filter((c: CustomerSearchResult) => !memberIds.has(c.id)))
      }
    } finally {
      setSearching(false)
    }
  }

  /* ---- Add member ---- */
  const handleAddMember = async (customerId: string) => {
    const res = await fetch(`/api/customer-groups/${groupId}/members/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_ids: [customerId] }),
      cache: 'no-store',
    })
    if (res.ok) {
      setSearchResults(prev => prev.filter(c => c.id !== customerId))
      fetchGroup()
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Loading / error                                                  */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-gray-500 text-sm">Group not found.</span>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/customers/groups"
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-50">{group.name}</h1>
      </div>

      {/* Group Information */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
          Group Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <button
              onClick={() => setEditActive(prev => !prev)}
              className={`h-10 px-4 rounded-lg text-sm font-medium border transition-colors ${
                editActive
                  ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700 hover:bg-emerald-900/70'
                  : 'bg-red-900/50 text-red-400 border-red-700 hover:bg-red-900/70'
              }`}
            >
              {editActive ? 'Active' : 'Inactive'}
            </button>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              rows={3}
              className={inputCls + ' h-auto py-2'}
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSaveInfo}
            disabled={savingInfo || !editName.trim()}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {savingInfo ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Members ({members.length})
          </h2>
          <button
            onClick={() => {
              setShowSearch(!showSearch)
              setSearchResults([])
              setSearchQuery('')
            }}
            className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
          >
            {showSearch ? 'Close Search' : '+ Add Member'}
          </button>
        </div>

        {/* Inline customer search */}
        {showSearch && (
          <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
            <div className="flex gap-2 mb-3">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSearch()
                }}
                placeholder="Search customers by name, phone, or email..."
                className={inputCls}
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors shrink-0"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {searchResults.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-50 text-sm font-medium">
                        {fullName(c.first_name, c.last_name)}
                      </span>
                      {c.phone && <span className="text-gray-500 text-xs">{c.phone}</span>}
                      {c.email && <span className="text-gray-500 text-xs">{c.email}</span>}
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeCls(c.customer_type)}`}
                      >
                        {c.customer_type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAddMember(c.id)}
                      className="text-xs px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <p className="text-gray-500 text-xs">No customers found.</p>
            )}
          </div>
        )}

        {/* Members table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-6 py-3">Full Name</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-center px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-right px-6 py-3">Remove</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No members in this group yet.
                </td>
              </tr>
            )}
            {members.map(m => (
              <tr
                key={m.id}
                className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
              >
                <td className="px-6 py-3">
                  <Link
                    href={`/customers/${m.id}`}
                    className="text-gray-50 hover:text-emerald-400 font-medium transition-colors"
                  >
                    {fullName(m.first_name, m.last_name)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400">{m.phone ?? '-'}</td>
                <td className="px-4 py-3 text-gray-400">{m.email ?? '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeCls(m.customer_type)}`}
                  >
                    {m.customer_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{formatDate(m.joined_at)}</td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
                    title="Remove member"
                  >
                    &#10005;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
