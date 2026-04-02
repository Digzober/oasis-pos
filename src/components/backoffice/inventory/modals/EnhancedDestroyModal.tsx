'use client'

import { useState } from 'react'
import BaseActionModal from './BaseActionModal'

const inputCls =
  'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'
const selectCls =
  'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

const DESTROY_REASONS = [
  'Expired',
  'Damaged',
  'Failed Testing',
  'Regulatory Hold',
  'Other',
] as const

interface EnhancedDestroyModalProps {
  itemId: string
  productName: string
  packageId: string | null
  currentQty: number
  onClose: () => void
  onSuccess: () => void
}

export default function EnhancedDestroyModal({
  itemId,
  productName,
  packageId,
  currentQty,
  onClose,
  onSuccess,
}: EnhancedDestroyModalProps) {
  const [quantity, setQuantity] = useState(currentQty)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const submitDisabled = !reason || !notes.trim() || !confirmed || quantity <= 0

  async function handleSubmit() {
    const res = await fetch('/api/inventory/destroy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        quantity,
        reason,
        notes,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to destroy package')
    }
    onSuccess()
    onClose()
  }

  return (
    <BaseActionModal
      title="Destroy Package"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Destroy Package"
      submitColor="red"
      submitDisabled={submitDisabled}
    >
      <div className="space-y-4">
        {/* Warning banner */}
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
          <p className="text-sm text-red-400">
            This will permanently mark this package as destroyed. This action
            syncs with BioTrack and cannot be undone.
          </p>
        </div>

        {/* Source info */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Product</span>
            <span className="text-gray-200">{productName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Package ID</span>
            <span className="text-gray-200 font-mono text-xs">
              {packageId ?? 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Current Quantity</span>
            <span className="text-gray-200">{currentQty}</span>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className={labelCls}>Quantity to Destroy</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v) && v >= 0 && v <= currentQty) setQuantity(v)
            }}
            max={currentQty}
            min={0}
            step="any"
            className={inputCls}
          />
          <p className="text-xs text-gray-500 mt-1">
            Max: {currentQty}
          </p>
        </div>

        {/* Reason */}
        <div>
          <label className={labelCls}>Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={selectCls}
          >
            <option value="">Select a reason...</option>
            {DESTROY_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>Notes (required)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Describe the reason for destruction..."
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Confirmation */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-900 text-red-600 focus:ring-red-500"
          />
          <span className="text-sm text-gray-300">
            I confirm this package should be destroyed
          </span>
        </label>
      </div>
    </BaseActionModal>
  )
}
