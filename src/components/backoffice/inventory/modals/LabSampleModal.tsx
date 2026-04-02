'use client'

import { useState } from 'react'
import BaseActionModal from './BaseActionModal'

interface LabSampleModalProps {
  itemId: string
  productName: string
  packageId: string | null
  currentQty: number
  onClose: () => void
  onSuccess: () => void
}

export default function LabSampleModal({
  itemId,
  productName,
  packageId,
  currentQty,
  onClose,
  onSuccess,
}: LabSampleModalProps) {
  const [sampleQuantity, setSampleQuantity] = useState<string>('')
  const [labName, setLabName] = useState('')
  const [sampleDate, setSampleDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState('')

  const qty = parseFloat(sampleQuantity) || 0
  const isValid = qty > 0 && qty <= currentQty

  async function handleSubmit() {
    const res = await fetch('/api/inventory/lab-sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        sample_quantity: qty,
        lab_name: labName || null,
        sample_date: sampleDate,
        notes: notes || null,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to create lab sample')
    }
    onSuccess()
    onClose()
  }

  const titleSuffix = packageId ? ` (${packageId})` : ''

  return (
    <BaseActionModal
      title={`Lab Sample - ${productName}${titleSuffix}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Submit Lab Sample"
      submitDisabled={!isValid}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Sample Quantity
          </label>
          <input
            type="number"
            required
            step="0.001"
            min="0"
            max={currentQty}
            value={sampleQuantity}
            onChange={(e) => setSampleQuantity(e.target.value)}
            placeholder={`Max: ${currentQty}`}
            className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Available: {currentQty}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Lab Name
          </label>
          <input
            type="text"
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            placeholder="Optional"
            className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Sample Date
          </label>
          <input
            type="date"
            value={sampleDate}
            onChange={(e) => setSampleDate(e.target.value)}
            className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            rows={3}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
          />
        </div>
      </div>
    </BaseActionModal>
  )
}
