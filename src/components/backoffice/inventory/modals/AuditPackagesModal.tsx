'use client'

import { useState } from 'react'
import BaseActionModal from './BaseActionModal'

interface AuditPackagesModalProps {
  itemIds: string[]
  onClose: () => void
  onSuccess: () => void
}

export default function AuditPackagesModal({
  itemIds,
  onClose,
  onSuccess,
}: AuditPackagesModalProps) {
  const [name, setName] = useState('')
  const [workflow, setWorkflow] = useState('simple')
  const [blind, setBlind] = useState(false)
  const [auditType, setAuditType] = useState('manual')

  async function handleSubmit() {
    const res = await fetch('/api/inventory/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        notes: null,
        scopeRooms: null,
        scopeCategories: null,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to create audit')
    }
    onSuccess()
    onClose()
  }

  return (
    <BaseActionModal
      title="Audit Packages"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Start Audit"
      submitDisabled={!name.trim()}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          {itemIds.length} package{itemIds.length !== 1 ? 's' : ''} selected
          for audit.
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Audit Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter audit name..."
            className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Workflow
          </label>
          <select
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value)}
            className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="simple">Simple</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Blind Audit
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="blind"
                checked={!blind}
                onChange={() => setBlind(false)}
                className="text-emerald-500 focus:ring-emerald-500 bg-gray-900 border-gray-600"
              />
              <span className="text-sm text-gray-300">No</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="blind"
                checked={blind}
                onChange={() => setBlind(true)}
                className="text-emerald-500 focus:ring-emerald-500 bg-gray-900 border-gray-600"
              />
              <span className="text-sm text-gray-300">Yes</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Type
          </label>
          <select
            value={auditType}
            onChange={(e) => setAuditType(e.target.value)}
            className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>
    </BaseActionModal>
  )
}
