'use client'

import { useState, useEffect, useCallback } from 'react'

type FieldVisibility = 'required' | 'show' | 'hide'

interface FieldDefinition {
  key: string
  label: string
  default: FieldVisibility
  lockRequired: boolean
}

interface ApiResponse {
  config: Record<string, FieldVisibility>
  fields: FieldDefinition[]
}

export default function FieldsTab() {
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [config, setConfig] = useState<Record<string, FieldVisibility>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalConfig, setOriginalConfig] = useState<Record<string, FieldVisibility>>({})

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/product-fields')
      if (!res.ok) {
        throw new Error('Failed to load configuration')
      }
      const data: ApiResponse = await res.json()
      setFields(data.fields)
      setConfig(data.config)
      setOriginalConfig(data.config)
      setHasChanges(false)
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load field configuration' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  const handleChange = (key: string, value: FieldVisibility) => {
    setConfig(prev => {
      const next = { ...prev, [key]: value }
      setHasChanges(JSON.stringify(next) !== JSON.stringify(originalConfig))
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/settings/product-fields', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save')
      }
      const data = await res.json()
      setConfig(data.config)
      setOriginalConfig(data.config)
      setHasChanges(false)
      setFeedback({ type: 'success', message: 'Product field configuration saved successfully' })
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save configuration' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const defaults: Record<string, FieldVisibility> = {}
    for (const field of fields) {
      defaults[field.key] = field.default
    }
    setConfig(defaults)
    setHasChanges(JSON.stringify(defaults) !== JSON.stringify(originalConfig))
  }

  const radioOptions: { value: FieldVisibility; label: string }[] = [
    { value: 'required', label: 'Required' },
    { value: 'show', label: 'Show' },
    { value: 'hide', label: 'Hide' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-secondary text-sm">Loading field configuration...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Product Field Configuration</h2>
          <p className="text-sm text-secondary mt-1">
            Control which fields are required, visible, or hidden when creating and editing products.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="text-sm px-3 py-1.5 text-secondary border border-edge-strong rounded-lg hover:bg-raised disabled:opacity-50"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="text-sm px-4 py-1.5 bg-accent text-primary rounded-lg hover:bg-accent disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${
          feedback.type === 'success'
            ? 'bg-accent/50 border border-accent text-accent'
            : 'bg-danger/50 border border-danger text-danger'
        }`}>
          {feedback.message}
        </div>
      )}

      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-secondary text-xs uppercase">
              <th className="text-left px-4 py-3 w-1/3">Field</th>
              <th className="text-center px-4 py-3">Required</th>
              <th className="text-center px-4 py-3">Show</th>
              <th className="text-center px-4 py-3">Hide</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const currentValue = config[field.key] ?? field.default
              const isLocked = field.lockRequired

              return (
                <tr key={field.key} className="border-b border-edge/50 hover:bg-raised/20">
                  <td className="px-4 py-3">
                    <span className="text-primary">{field.label}</span>
                    {isLocked && (
                      <span className="ml-2 text-xs text-warning" title="This field cannot be hidden">
                        (core field)
                      </span>
                    )}
                  </td>
                  {radioOptions.map((option) => {
                    const isDisabled = isLocked && option.value === 'hide'
                    const isChecked = currentValue === option.value
                    const inputId = `${field.key}-${option.value}`

                    return (
                      <td key={option.value} className="px-4 py-3 text-center">
                        <label htmlFor={inputId} className="inline-flex items-center cursor-pointer">
                          <input
                            id={inputId}
                            type="radio"
                            name={field.key}
                            value={option.value}
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => handleChange(field.key, option.value)}
                            className="w-4 h-4 text-accent bg-bg border-edge-strong focus:ring-accent focus:ring-offset-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </label>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-muted space-y-1">
        <p><span className="text-secondary font-medium">Required</span> -- Field must be filled when creating/editing a product.</p>
        <p><span className="text-secondary font-medium">Show</span> -- Field is visible but optional.</p>
        <p><span className="text-secondary font-medium">Hide</span> -- Field is not displayed in the product form.</p>
        <p className="text-warning/70">Core fields (Product Name, Category, Rec Price) cannot be hidden.</p>
      </div>
    </div>
  )
}
