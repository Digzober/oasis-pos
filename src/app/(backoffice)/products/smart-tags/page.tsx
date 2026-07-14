'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Play, Trash2, Pencil, Zap, X, Loader2 } from 'lucide-react'
import { DENSE_BESPOKE_TABLE_CLASS } from '@/lib/constants/tableDensity'

interface Tag {
  id: string
  name: string
  color: string | null
}

interface SmartTagCondition {
  field: string
  operator: string
  value: string | number
}

interface SmartTagRule {
  id: string
  name: string
  tag_id: string
  rules: SmartTagCondition[]
  is_active: boolean
  last_run_at: string | null
  tags: Tag | null
}

const FIELD_OPTIONS = [
  { value: 'thc_percentage', label: 'THC %' },
  { value: 'cbd_percentage', label: 'CBD %' },
  { value: 'weight_grams', label: 'Weight (g)' },
  { value: 'rec_price', label: 'Rec Price' },
  { value: 'med_price', label: 'Med Price' },
  { value: 'is_cannabis', label: 'Is Cannabis' },
  { value: 'category_id', label: 'Category ID' },
  { value: 'brand_id', label: 'Brand ID' },
  { value: 'strain_type', label: 'Strain Type' },
  { value: 'available_for', label: 'Available For' },
  { value: 'product_type', label: 'Product Type' },
] as const

const OPERATOR_OPTIONS = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: 'contains', label: 'contains' },
] as const

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  return new Date(dateStr).toLocaleString()
}

export default function SmartTagsPage() {
  const [rules, setRules] = useState<SmartTagRule[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<SmartTagRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runningAll, setRunningAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formTagId, setFormTagId] = useState('')
  const [formConditions, setFormConditions] = useState<SmartTagCondition[]>([
    { field: 'thc_percentage', operator: '>', value: '' as unknown as number },
  ])

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/smart-tags')
      const json = await res.json()
      if (res.ok) {
        setRules(json.rules)
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to load smart tag rules')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags')
      const json = await res.json()
      if (res.ok) {
        setTags(json.tags)
      }
    } catch {
      // Tags fetch failure is non-critical
    }
  }, [])

  useEffect(() => {
    fetchRules()
    fetchTags()
  }, [fetchRules, fetchTags])

  function clearMessages() {
    setError(null)
    setSuccessMsg(null)
  }

  function openCreateForm() {
    clearMessages()
    setEditingRule(null)
    setFormName('')
    setFormTagId('')
    setFormConditions([{ field: 'thc_percentage', operator: '>', value: '' as unknown as number }])
    setShowForm(true)
  }

  function openEditForm(rule: SmartTagRule) {
    clearMessages()
    setEditingRule(rule)
    setFormName(rule.name)
    setFormTagId(rule.tag_id)
    setFormConditions([...rule.rules])
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingRule(null)
  }

  function addCondition() {
    setFormConditions((prev) => [
      ...prev,
      { field: 'thc_percentage', operator: '>', value: '' as unknown as number },
    ])
  }

  function removeCondition(index: number) {
    setFormConditions((prev) => prev.filter((_, i) => i !== index))
  }

  function updateCondition(index: number, key: keyof SmartTagCondition, val: string) {
    setFormConditions((prev) => {
      const next = [...prev]
      const current = next[index]
      if (!current) return next
      if (key === 'value') {
        const numVal = Number(val)
        next[index] = { field: current.field, operator: current.operator, value: isNaN(numVal) || val === '' ? val : numVal }
      } else if (key === 'field') {
        next[index] = { field: val, operator: current.operator, value: current.value }
      } else {
        next[index] = { field: current.field, operator: val, value: current.value }
      }
      return next
    })
  }

  async function handleSave() {
    clearMessages()
    setSaving(true)
    try {
      const payload = {
        name: formName,
        tag_id: formTagId,
        rules: formConditions,
      }

      const url = editingRule ? `/api/smart-tags/${editingRule.id}` : '/api/smart-tags'
      const method = editingRule ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error)
        return
      }

      setSuccessMsg(editingRule ? 'Rule updated' : 'Rule created')
      closeForm()
      await fetchRules()
    } catch {
      setError('Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  async function handleRun(ruleId: string) {
    clearMessages()
    setRunningId(ruleId)
    try {
      const res = await fetch(`/api/smart-tags/${ruleId}/run`, { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setSuccessMsg(`Tagged ${json.tagged} products, untagged ${json.untagged}`)
        await fetchRules()
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to run rule')
    } finally {
      setRunningId(null)
    }
  }

  async function handleRunAll() {
    clearMessages()
    setRunningAll(true)
    try {
      const res = await fetch('/api/smart-tags/run-all', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setSuccessMsg(
          `Processed ${json.rulesProcessed} rules: ${json.totalTagged} tagged, ${json.totalUntagged} untagged` +
          (json.errors ? ` (${json.errors.length} errors)` : ''),
        )
        await fetchRules()
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to run all rules')
    } finally {
      setRunningAll(false)
    }
  }

  async function handleDeactivate(ruleId: string) {
    clearMessages()
    try {
      const res = await fetch(`/api/smart-tags/${ruleId}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok) {
        setSuccessMsg('Rule deactivated')
        await fetchRules()
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to deactivate rule')
    }
  }

  async function handleToggleActive(rule: SmartTagRule) {
    clearMessages()
    try {
      const res = await fetch(`/api/smart-tags/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      })
      const json = await res.json()
      if (res.ok) {
        setSuccessMsg(`Rule ${rule.is_active ? 'deactivated' : 'activated'}`)
        await fetchRules()
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to update rule')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-secondary" size={32} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">Smart Tags</h1>
          <p className="text-sm text-secondary mt-1">
            Auto-tag products based on rule conditions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAll}
            disabled={runningAll || rules.filter((r) => r.is_active).length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-warning hover:bg-warning text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {runningAll ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Run All
          </button>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent hover:bg-accent text-primary transition-colors"
          >
            <Plus size={16} />
            Create Rule
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/40 border border-danger text-danger text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-danger hover:text-danger">
            <X size={14} />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-accent/40 border border-accent text-accent text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-accent hover:text-accent">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Rules Table */}
      {rules.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-lg mb-2">No smart tag rules yet</p>
          <p className="text-sm">Create a rule to automatically tag products based on conditions.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-edge overflow-hidden">
            <table data-density="compact" className={`${DENSE_BESPOKE_TABLE_CLASS} w-full`}>
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left px-4 py-3 text-secondary font-medium">Name</th>
                <th className="text-left px-4 py-3 text-secondary font-medium">Tag</th>
                <th className="text-center px-4 py-3 text-secondary font-medium">Conditions</th>
                <th className="text-left px-4 py-3 text-secondary font-medium">Last Run</th>
                <th className="text-center px-4 py-3 text-secondary font-medium">Status</th>
                <th className="text-right px-4 py-3 text-secondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-edge/50 hover:bg-raised/50">
                  <td className="px-4 py-3 text-primary font-medium">{rule.name}</td>
                  <td className="px-4 py-3">
                    {rule.tags ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: rule.tags.color ? `${rule.tags.color}20` : 'var(--surface-raised)',
                          color: rule.tags.color ?? 'var(--text-muted)',
                          border: `1px solid ${rule.tags.color ?? 'var(--edge-strong)'}`,
                        }}
                      >
                        {rule.tags.name}
                      </span>
                    ) : (
                      <span className="text-muted">Unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-secondary">{rule.rules.length}</td>
                  <td className="px-4 py-3 text-secondary text-xs">{formatDate(rule.last_run_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        rule.is_active
                          ? 'bg-accent/40 text-accent border border-accent hover:bg-accent/60'
                          : 'bg-raised text-muted border border-edge-strong hover:bg-raised'
                      }`}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleRun(rule.id)}
                        disabled={runningId === rule.id || !rule.is_active}
                        className="p-1.5 rounded text-info hover:bg-info/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Run rule"
                      >
                        {runningId === rule.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Play size={15} />
                        )}
                      </button>
                      <button
                        onClick={() => openEditForm(rule)}
                        className="p-1.5 rounded text-secondary hover:bg-raised hover:text-primary transition-colors"
                        title="Edit rule"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDeactivate(rule.id)}
                        className="p-1.5 rounded text-danger hover:bg-danger/30 transition-colors"
                        title="Deactivate rule"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-bg/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-edge w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
              <h2 className="text-lg font-semibold text-primary">
                {editingRule ? 'Edit Rule' : 'Create Smart Tag Rule'}
              </h2>
              <button onClick={closeForm} className="text-secondary hover:text-primary">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Rule Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., High THC Products"
                  className="w-full px-3 py-2 rounded-lg bg-bg border border-edge-strong text-primary text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>

              {/* Tag Select */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Tag to Apply</label>
                <select
                  value={formTagId}
                  onChange={(e) => setFormTagId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bg border border-edge-strong text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="">Select a tag...</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-secondary">
                    Conditions <span className="text-muted font-normal">(all must match)</span>
                  </label>
                  <button
                    onClick={addCondition}
                    className="text-xs text-accent hover:text-accent transition-colors"
                  >
                    + Add Condition
                  </button>
                </div>

                <div className="space-y-2">
                  {formConditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={cond.field}
                        onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded bg-bg border border-edge-strong text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {FIELD_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                        className="w-24 px-2 py-1.5 rounded bg-bg border border-edge-strong text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {OPERATOR_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={String(cond.value)}
                        onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-2 py-1.5 rounded bg-bg border border-edge-strong text-primary text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      {formConditions.length > 1 && (
                        <button
                          onClick={() => removeCondition(idx)}
                          className="p-1 text-danger hover:text-danger transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-edge">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formTagId}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent hover:bg-accent text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
