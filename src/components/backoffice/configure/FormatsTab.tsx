'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface PackageFormat {
  id: string
  name: string
  category_id: string | null
  format: string
  is_active: boolean
}

interface TokenInfo {
  token: string
  description: string
  example: string
}

interface Category {
  id: string
  name: string
}

type FormMode = 'closed' | 'create' | 'edit'

function generateId(): string {
  return crypto.randomUUID()
}

export default function FormatsTab() {
  const [formats, setFormats] = useState<PackageFormat[]>([])
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editId, setEditId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formCategoryId, setFormCategoryId] = useState<string | null>(null)
  const [formFormat, setFormFormat] = useState('')
  const [livePreview, setLivePreview] = useState('')

  const formatInputRef = useRef<HTMLInputElement>(null)
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [formatsRes, categoriesRes] = await Promise.all([
        fetch('/api/settings/package-formats'),
        fetch('/api/categories'),
      ])

      if (formatsRes.ok) {
        const data = await formatsRes.json()
        setFormats(data.formats ?? [])
        setTokens(data.tokens ?? [])
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        const cats = data.categories ?? data ?? []
        setCategories(Array.isArray(cats) ? cats : [])
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load data' })
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

  const updatePreview = useCallback((formatStr: string) => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }

    if (!formatStr.trim()) {
      setLivePreview('')
      return
    }

    previewTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/settings/package-formats/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: formatStr }),
        })
        if (res.ok) {
          const data = await res.json()
          setLivePreview(data.preview ?? '')
        }
      } catch {
        setLivePreview('(preview error)')
      }
    }, 300)
  }, [])

  const handleFormatChange = (value: string) => {
    setFormFormat(value)
    updatePreview(value)
  }

  const insertToken = (token: string) => {
    const input = formatInputRef.current
    if (!input) {
      setFormFormat(prev => prev + token)
      updatePreview(formFormat + token)
      return
    }

    const start = input.selectionStart ?? formFormat.length
    const end = input.selectionEnd ?? formFormat.length
    const newValue = formFormat.substring(0, start) + token + formFormat.substring(end)
    setFormFormat(newValue)
    updatePreview(newValue)

    requestAnimationFrame(() => {
      const cursorPos = start + token.length
      input.setSelectionRange(cursorPos, cursorPos)
      input.focus()
    })
  }

  const openCreateForm = () => {
    setFormMode('create')
    setEditId(null)
    setFormName('')
    setFormCategoryId(null)
    setFormFormat('')
    setLivePreview('')
  }

  const openEditForm = (fmt: PackageFormat) => {
    setFormMode('edit')
    setEditId(fmt.id)
    setFormName(fmt.name)
    setFormCategoryId(fmt.category_id)
    setFormFormat(fmt.format)
    updatePreview(fmt.format)
  }

  const closeForm = () => {
    setFormMode('closed')
    setEditId(null)
    setFormName('')
    setFormCategoryId(null)
    setFormFormat('')
    setLivePreview('')
  }

  const handleSubmit = async () => {
    if (!formName.trim()) {
      setFeedback({ type: 'error', message: 'Name is required' })
      return
    }
    if (!formFormat.trim()) {
      setFeedback({ type: 'error', message: 'Format template is required' })
      return
    }

    setSaving(true)
    setFeedback(null)

    try {
      if (formMode === 'create') {
        const res = await fetch('/api/settings/package-formats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: generateId(),
            name: formName.trim(),
            category_id: formCategoryId,
            format: formFormat.trim(),
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? 'Failed to create format')
        }

        const data = await res.json()
        setFormats(data.formats)
        setFeedback({ type: 'success', message: 'Format created successfully' })
        closeForm()
      } else if (formMode === 'edit' && editId) {
        const res = await fetch(`/api/settings/package-formats/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            category_id: formCategoryId,
            format: formFormat.trim(),
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? 'Failed to update format')
        }

        const data = await res.json()
        setFormats(data.formats)
        setFeedback({ type: 'success', message: 'Format updated successfully' })
        closeForm()
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Operation failed' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/settings/package-formats/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('Failed to deactivate format')
      }
      const data = await res.json()
      setFormats(data.formats)
      setFeedback({ type: 'success', message: 'Format deactivated' })
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to deactivate' })
    } finally {
      setSaving(false)
    }
  }

  const handleReactivate = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/settings/package-formats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })
      if (!res.ok) {
        throw new Error('Failed to reactivate format')
      }
      const data = await res.json()
      setFormats(data.formats)
      setFeedback({ type: 'success', message: 'Format reactivated' })
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to reactivate' })
    } finally {
      setSaving(false)
    }
  }

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return 'Default (all categories)'
    const cat = categories.find(c => c.id === categoryId)
    return cat ? cat.name : 'Unknown category'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading package formats...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-50">Package ID Formats</h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure token-based format templates for generating package IDs. Assign formats to specific categories or set a default.
          </p>
        </div>
        {formMode === 'closed' && (
          <button
            onClick={openCreateForm}
            className="text-sm px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
          >
            Add Format
          </button>
        )}
      </div>

      {feedback && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${
          feedback.type === 'success'
            ? 'bg-emerald-900/50 border border-emerald-700 text-emerald-300'
            : 'bg-red-900/50 border border-red-700 text-red-300'
        }`}>
          {feedback.message}
        </div>
      )}

      {formMode !== 'closed' && (
        <div className="mb-6 bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-50 mb-4">
            {formMode === 'create' ? 'New Format' : 'Edit Format'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="format-name" className="block text-xs font-medium text-gray-400 mb-1">
                Name
              </label>
              <input
                id="format-name"
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g., Standard Package ID"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="format-category" className="block text-xs font-medium text-gray-400 mb-1">
                Category (optional)
              </label>
              <select
                id="format-category"
                value={formCategoryId ?? ''}
                onChange={e => setFormCategoryId(e.target.value || null)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Default (all categories)</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="format-template" className="block text-xs font-medium text-gray-400 mb-1">
              Format Template
            </label>
            <input
              id="format-template"
              ref={formatInputRef}
              type="text"
              value={formFormat}
              onChange={e => handleFormatChange(e.target.value)}
              placeholder="e.g., {location}-{date:yyyyMMdd}-{seq:D4}"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 font-mono placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="mb-4">
            <span className="block text-xs font-medium text-gray-400 mb-2">Insert Token</span>
            <div className="flex flex-wrap gap-1.5">
              {tokens.map(t => (
                <button
                  key={t.token}
                  onClick={() => insertToken(t.token)}
                  type="button"
                  title={`${t.description} (e.g., ${t.example})`}
                  className="px-2 py-1 text-xs font-mono bg-gray-700 border border-gray-600 text-gray-300 rounded hover:bg-gray-600 hover:text-gray-50 transition-colors"
                >
                  {t.token}
                </button>
              ))}
            </div>
          </div>

          {livePreview && (
            <div className="mb-4 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg">
              <span className="text-xs font-medium text-gray-400 block mb-1">Live Preview</span>
              <span className="text-sm font-mono text-emerald-400">{livePreview}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="text-sm px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : formMode === 'create' ? 'Create Format' : 'Save Changes'}
            </button>
            <button
              onClick={closeForm}
              disabled={saving}
              className="text-sm px-3 py-1.5 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Format Template</th>
              <th className="text-left px-4 py-3">Preview</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {formats.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No package formats configured. Click &quot;Add Format&quot; to create one.
                </td>
              </tr>
            )}
            {formats.map(fmt => (
              <FormatRow
                key={fmt.id}
                fmt={fmt}
                categoryName={getCategoryName(fmt.category_id)}
                saving={saving}
                onEdit={() => openEditForm(fmt)}
                onDeactivate={() => handleDeactivate(fmt.id)}
                onReactivate={() => handleReactivate(fmt.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-50 mb-3">Token Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {tokens.map(t => (
            <div key={t.token} className="flex items-start gap-2 text-xs">
              <code className="px-1.5 py-0.5 bg-gray-900 border border-gray-600 rounded font-mono text-emerald-400 whitespace-nowrap">
                {t.token}
              </code>
              <span className="text-gray-400">{t.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FormatRow({
  fmt,
  categoryName,
  saving,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  fmt: PackageFormat
  categoryName: string
  saving: boolean
  onEdit: () => void
  onDeactivate: () => void
  onReactivate: () => void
}) {
  const [preview, setPreview] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadPreview() {
      try {
        const res = await fetch('/api/settings/package-formats/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: fmt.format }),
        })
        if (res.ok && !cancelled) {
          const data = await res.json()
          setPreview(data.preview ?? '')
        }
      } catch {
        if (!cancelled) setPreview('--')
      }
    }
    loadPreview()
    return () => { cancelled = true }
  }, [fmt.format])

  return (
    <tr className="border-b border-gray-700/50 hover:bg-gray-700/20">
      <td className="px-4 py-3 text-gray-50 font-medium">{fmt.name}</td>
      <td className="px-4 py-3 text-gray-400">{categoryName}</td>
      <td className="px-4 py-3">
        <code className="text-xs font-mono text-gray-300 bg-gray-900 px-1.5 py-0.5 rounded">
          {fmt.format}
        </code>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-mono text-emerald-400">{preview}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
          fmt.is_active
            ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
            : 'bg-gray-700/50 text-gray-500 border border-gray-600'
        }`}>
          {fmt.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onEdit}
            disabled={saving}
            className="text-xs text-gray-400 hover:text-gray-50 disabled:opacity-50"
          >
            Edit
          </button>
          {fmt.is_active ? (
            <button
              onClick={onDeactivate}
              disabled={saving}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              Deactivate
            </button>
          ) : (
            <button
              onClick={onReactivate}
              disabled={saving}
              className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
            >
              Reactivate
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
