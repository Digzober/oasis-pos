'use client'

import { useState, useEffect } from 'react'
import BaseActionModal from './BaseActionModal'

const inputCls =
  'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'
const selectCls =
  'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

interface LabelTemplate {
  id: string
  name: string
  width?: number
  height?: number
  dpi?: number
}

interface EnhancedPrintLabelsModalProps {
  itemIds: string[]
  productName?: string
  onClose: () => void
  onSuccess?: () => void
}

export default function EnhancedPrintLabelsModal({
  itemIds,
  productName,
  onClose,
  onSuccess,
}: EnhancedPrintLabelsModalProps) {
  const [templateId, setTemplateId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [templates, setTemplates] = useState<LabelTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/labels/templates')
        if (res.ok) {
          const data = await res.json()
          setTemplates(data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchTemplates()
  }, [])

  const submitDisabled = !templateId || quantity < 1

  async function handleSubmit() {
    let res = await fetch('/api/labels/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_ids: itemIds,
        template_id: templateId,
        quantity,
      }),
    })

    if (res.status === 404) {
      res = await fetch('/api/inventory/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: itemIds }),
      })
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to print labels')
    }

    onSuccess?.()
    onClose()
  }

  return (
    <BaseActionModal
      title="Print Labels"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Print"
      submitDisabled={submitDisabled}
    >
      <div className="space-y-4">
        {productName && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
            <p className="text-sm text-gray-300">
              <span className="text-gray-500">Product: </span>
              {productName}
            </p>
            <p className="text-sm text-gray-300 mt-1">
              <span className="text-gray-500">Items: </span>
              {itemIds.length}
            </p>
          </div>
        )}

        <div>
          <label className={labelCls}>Label Template</label>
          {loading ? (
            <div className={`${selectCls} flex items-center text-gray-500`}>
              Loading templates...
            </div>
          ) : (
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={selectCls}
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.width && t.height ? ` (${t.width} x ${t.height})` : ''}
                  {t.dpi ? ` - ${t.dpi} DPI` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className={labelCls}>Quantity per Item</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 1) setQuantity(v)
            }}
            min={1}
            className={inputCls}
          />
          <p className="text-xs text-gray-500 mt-1">
            Total labels: {quantity * itemIds.length}
          </p>
        </div>
      </div>
    </BaseActionModal>
  )
}
