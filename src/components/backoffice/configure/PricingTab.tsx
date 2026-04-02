'use client'

import { useState, useEffect, useCallback } from 'react'

interface PricingTierGroup {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

interface PricingTier {
  id: string
  name: string
  multiplier: number
  group_id: string | null
  is_active: boolean
}

const inputCls = 'w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500'
const selectCls = 'w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500'

export default function PricingTab() {
  const [groups, setGroups] = useState<PricingTierGroup[]>([])
  const [tiers, setTiers] = useState<PricingTier[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editGroupId, setEditGroupId] = useState<string | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })
  const [savingGroup, setSavingGroup] = useState(false)

  const [showTierModal, setShowTierModal] = useState(false)
  const [editTierId, setEditTierId] = useState<string | null>(null)
  const [tierForm, setTierForm] = useState({ name: '', multiplier: '1.00', group_id: '' })
  const [savingTier, setSavingTier] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [groupsRes, tiersRes] = await Promise.all([
        fetch('/api/settings/pricing-tier-groups'),
        fetch('/api/settings/pricing-tiers'),
      ])

      if (groupsRes.ok) {
        const data = await groupsRes.json()
        setGroups(data.groups ?? [])
      }

      if (tiersRes.ok) {
        const data = await tiersRes.json()
        setTiers(data.tiers ?? [])
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load pricing data' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  const openNewGroup = () => {
    setEditGroupId(null)
    setGroupForm({ name: '', description: '' })
    setShowGroupModal(true)
  }

  const openEditGroup = (group: PricingTierGroup) => {
    setEditGroupId(group.id)
    setGroupForm({ name: group.name, description: group.description ?? '' })
    setShowGroupModal(true)
  }

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      setFeedback({ type: 'error', message: 'Group name is required' })
      return
    }

    setSavingGroup(true)
    try {
      const url = editGroupId
        ? `/api/settings/pricing-tier-groups/${editGroupId}`
        : '/api/settings/pricing-tier-groups'
      const method = editGroupId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupForm.name.trim(),
          description: groupForm.description.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save group')
      }

      setShowGroupModal(false)
      setFeedback({ type: 'success', message: editGroupId ? 'Group updated' : 'Group created' })
      fetchData()
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save group' })
    } finally {
      setSavingGroup(false)
    }
  }

  const handleDeactivateGroup = async (id: string) => {
    if (!confirm('Deactivate this tier group? Tiers in this group will remain but become ungrouped.')) return
    try {
      const res = await fetch(`/api/settings/pricing-tier-groups/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to deactivate group')
      }
      setFeedback({ type: 'success', message: 'Group deactivated' })
      fetchData()
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to deactivate group' })
    }
  }

  const openNewTier = () => {
    setEditTierId(null)
    setTierForm({ name: '', multiplier: '1.00', group_id: '' })
    setShowTierModal(true)
  }

  const openEditTier = (tier: PricingTier) => {
    setEditTierId(tier.id)
    setTierForm({
      name: tier.name,
      multiplier: String(tier.multiplier),
      group_id: tier.group_id ?? '',
    })
    setShowTierModal(true)
  }

  const handleSaveTier = async () => {
    if (!tierForm.name.trim()) {
      setFeedback({ type: 'error', message: 'Tier name is required' })
      return
    }

    const multiplier = parseFloat(tierForm.multiplier)
    if (isNaN(multiplier) || multiplier <= 0) {
      setFeedback({ type: 'error', message: 'Multiplier must be a positive number' })
      return
    }

    setSavingTier(true)
    try {
      const url = editTierId
        ? `/api/settings/pricing-tiers/${editTierId}`
        : '/api/settings/pricing-tiers'
      const method = editTierId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tierForm.name.trim(),
          multiplier,
          group_id: tierForm.group_id || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save tier')
      }

      setShowTierModal(false)
      setFeedback({ type: 'success', message: editTierId ? 'Tier updated' : 'Tier created' })
      fetchData()
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save tier' })
    } finally {
      setSavingTier(false)
    }
  }

  const handleDeactivateTier = async (id: string) => {
    if (!confirm('Deactivate this pricing tier?')) return
    try {
      const res = await fetch(`/api/settings/pricing-tiers/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to deactivate tier')
      }
      setFeedback({ type: 'success', message: 'Tier deactivated' })
      fetchData()
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to deactivate tier' })
    }
  }

  const getGroupName = (groupId: string | null): string => {
    if (!groupId) return '\u2014'
    const group = groups.find(g => g.id === groupId)
    return group ? group.name : 'Unknown'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading pricing configuration...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {feedback && (
        <div className={`px-4 py-2.5 rounded-lg text-sm ${
          feedback.type === 'success'
            ? 'bg-emerald-900/50 border border-emerald-700 text-emerald-300'
            : 'bg-red-900/50 border border-red-700 text-red-300'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Tier Groups Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-50">Tier Groups</h2>
            <p className="text-sm text-gray-400 mt-0.5">Organize pricing tiers into logical groups.</p>
          </div>
          <button
            onClick={openNewGroup}
            className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
          >
            + Add Group
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No tier groups configured. Click &quot;+ Add Group&quot; to create one.
                  </td>
                </tr>
              ) : groups.map(group => (
                <tr key={group.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="px-4 py-3 text-gray-50 font-medium">{group.name}</td>
                  <td className="px-4 py-3 text-gray-400">{group.description ?? '\u2014'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      group.is_active
                        ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
                        : 'bg-gray-700/50 text-gray-500 border border-gray-600'
                    }`}>
                      {group.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEditGroup(group)}
                      className="text-xs text-gray-400 hover:text-emerald-400 mr-3"
                    >
                      Edit
                    </button>
                    {group.is_active && (
                      <button
                        onClick={() => handleDeactivateGroup(group.id)}
                        className="text-xs text-gray-400 hover:text-red-400"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Tiers Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-50">Pricing Tiers</h2>
            <p className="text-sm text-gray-400 mt-0.5">Define pricing multipliers for different customer segments or product tiers.</p>
          </div>
          <button
            onClick={openNewTier}
            className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
          >
            + Add Tier
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-right px-4 py-3">Multiplier</th>
                <th className="text-left px-4 py-3">Group</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tiers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No pricing tiers configured. Click &quot;+ Add Tier&quot; to create one.
                  </td>
                </tr>
              ) : tiers.map(tier => (
                <tr key={tier.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="px-4 py-3 text-gray-50 font-medium">{tier.name}</td>
                  <td className="px-4 py-3 text-right text-gray-300 font-mono tabular-nums">
                    {tier.multiplier.toFixed(2)}x
                  </td>
                  <td className="px-4 py-3 text-gray-400">{getGroupName(tier.group_id)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      tier.is_active
                        ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
                        : 'bg-gray-700/50 text-gray-500 border border-gray-600'
                    }`}>
                      {tier.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEditTier(tier)}
                      className="text-xs text-gray-400 hover:text-emerald-400 mr-3"
                    >
                      Edit
                    </button>
                    {tier.is_active && (
                      <button
                        onClick={() => handleDeactivateTier(tier.id)}
                        className="text-xs text-gray-400 hover:text-red-400"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-50">
              {editGroupId ? 'Edit' : 'New'} Tier Group
            </h3>

            <label className="block">
              <span className="text-xs text-gray-400">Name *</span>
              <input
                value={groupForm.name}
                onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))}
                className={inputCls}
                placeholder="e.g., Industry, Employee, VIP"
                autoFocus
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-400">Description</span>
              <input
                value={groupForm.description}
                onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))}
                className={inputCls}
                placeholder="Optional description"
              />
            </label>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowGroupModal(false)}
                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={savingGroup}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {savingGroup ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-50">
              {editTierId ? 'Edit' : 'New'} Pricing Tier
            </h3>

            <label className="block">
              <span className="text-xs text-gray-400">Name *</span>
              <input
                value={tierForm.name}
                onChange={e => setTierForm(p => ({ ...p, name: e.target.value }))}
                className={inputCls}
                placeholder="e.g., Standard, Premium, Employee"
                autoFocus
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-400">Multiplier *</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={tierForm.multiplier}
                onChange={e => setTierForm(p => ({ ...p, multiplier: e.target.value }))}
                className={inputCls}
                placeholder="1.00"
              />
              <span className="text-xs text-gray-500 mt-1 block">
                1.00 = base price. 0.80 = 20% discount. 1.20 = 20% markup.
              </span>
            </label>

            <label className="block">
              <span className="text-xs text-gray-400">Group</span>
              <select
                value={tierForm.group_id}
                onChange={e => setTierForm(p => ({ ...p, group_id: e.target.value }))}
                className={selectCls}
              >
                <option value="">No group</option>
                {groups.filter(g => g.is_active).map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowTierModal(false)}
                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTier}
                disabled={savingTier}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {savingTier ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
