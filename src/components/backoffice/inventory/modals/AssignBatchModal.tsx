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
          <label className="block text-xs font-medium text-secondary uppercase mb-1">
            Current Batch
          </label>
          <input
            type="text"
            readOnly
            value={currentBatch || 'None'}
            className="w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent opacity-60"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary uppercase mb-1">
            New Batch Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBatch}
              onChange={(e) => setNewBatch(e.target.value)}
              placeholder="Enter batch name..."
              className="flex-1 h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setNewBatch(generateBatchId())}
              className="px-3 h-10 text-sm font-medium bg-raised text-secondary rounded-lg hover:bg-raised transition-colors whitespace-nowrap"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    </BaseActionModal>
  )
}
