'use client'

import { useState, useEffect } from 'react'
import BaseActionModal from './BaseActionModal'
import { SearchableSelect } from '@/components/shared/SearchableSelect'

interface AssignVendorModalProps {
  itemId: string
  currentVendorName: string | null
  onClose: () => void
  onSuccess: () => void
}

export default function AssignVendorModal({
  itemId,
  currentVendorName,
  onClose,
  onSuccess,
}: AssignVendorModalProps) {
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVendors() {
      try {
        const res = await fetch('/api/vendors')
        if (res.ok) {
          const data = await res.json()
          setVendors(data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchVendors()
  }, [])

  const vendorOptions = vendors.map((v) => ({
    value: v.id,
    label: v.name,
  }))

  async function handleSubmit() {
    const res = await fetch(`/api/inventory/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor_id: selectedVendorId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to assign vendor')
    }
    onSuccess()
    onClose()
  }

  return (
    <BaseActionModal
      title="Assign Vendor"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Assign Vendor"
      submitDisabled={!selectedVendorId}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Current Vendor
          </label>
          <input
            type="text"
            readOnly
            value={currentVendorName || 'None'}
            className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent opacity-60"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            New Vendor
          </label>
          <SearchableSelect
            options={vendorOptions}
            value={selectedVendorId}
            onChange={setSelectedVendorId}
            placeholder="Select a vendor..."
            searchPlaceholder="Search vendors..."
            emptyMessage="No vendors found"
            loading={loading}
          />
        </div>
      </div>
    </BaseActionModal>
  )
}
