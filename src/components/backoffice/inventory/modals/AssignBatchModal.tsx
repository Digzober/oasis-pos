'use client'

import { useState } from 'react'
import BaseActionModal from './BaseActionModal'

interface AssignBatchModalProps {
  itemId: string
  currentBatch: string | null
  onClose: () => void
  onSuccess: () => void
}

function generateBatchId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `LOC-${year}${month}${day}-${random}`
}

export default function AssignBatchModal({
  itemId,
  currentBatch,
  onClose,
  onSuccess,
}: AssignBatchModalProps) {
  const [newBatch, setNewBatch] = useState('')

  async function handleSubmit() {
    const res = await fetch(`/api/inventory/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: newBatch }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to assign batch')
    }
    onSuccess()
    onClose()
  }

  return (
    <BaseActionModal
      title="Assign Batch"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Assign Batch"
      submitDisabled={!newBatch.trim()}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Current Batch
          </label>
          <input
            type="text"
            readOnly
            value={currentBatch || 'None'}
            className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent opacity-60"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            New Batch Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBatch}
              onChange={(e) => setNewBatch(e.target.value)}
              placeholder="Enter batch name..."
              className="flex-1 h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setNewBatch(generateBatchId())}
              className="px-3 h-10 text-sm font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    </BaseActionModal>
  )
}
