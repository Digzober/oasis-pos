'use client'

import { useState, useEffect } from 'react'
import BaseActionModal from './BaseActionModal'

const inputCls =
  'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'
const selectCls =
  'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

interface SourceItem {
  id: string
  productName: string
  packageId: string | null
  quantity: number
}

interface CombineModalProps {
  sourceItems: SourceItem[]
  onClose: () => void
  onSuccess: () => void
}

export default function CombineModal({
  sourceItems,
  onClose,
  onSuccess,
}: CombineModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const item of sourceItems) {
      map[item.id] = item.quantity
    }
    return map
  })
  const [targetId, setTargetId] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    const names = new Set(sourceItems.map((i) => i.productName))
    if (names.size > 1) {
      setValidationError(
        'All items must be the same product to combine. Selected items have different products.'
      )
    }
  }, [sourceItems])

  function updateQuantity(id: string, value: number) {
    const item = sourceItems.find((i) => i.id === id)
    if (!item) return
    const clamped = Math.min(Math.max(0, value), item.quantity)
    setQuantities((prev) => ({ ...prev, [id]: clamped }))
  }

  const allQuantitiesValid = sourceItems.every((item) => {
    const qty = quantities[item.id] ?? 0
    return qty > 0 && qty <= item.quantity
  })

  const submitDisabled =
    !!validationError || !targetId || !allQuantitiesValid

  async function handleSubmit() {
    const orderedIds = [
      targetId,
      ...sourceItems.filter((i) => i.id !== targetId).map((i) => i.id),
    ]
    const res = await fetch('/api/inventory/combine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_ids: orderedIds,
        quantities,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to combine packages')
    }
    onSuccess()
    onClose()
  }

  return (
    <BaseActionModal
      title="Combine Packages"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Combine"
      submitDisabled={submitDisabled}
      wide
    >
      <div className="space-y-6">
        {validationError && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <p className="text-sm text-red-400">{validationError}</p>
          </div>
        )}

        {/* FROM section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            Source Packages
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400 uppercase">
                    Package ID
                  </th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400 uppercase">
                    Product
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-400 uppercase">
                    Available
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-400 uppercase">
                    Qty to Combine
                  </th>
                </tr>
              </thead>
              <tbody>
                {sourceItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-700/50">
                    <td className="py-2 px-2 text-gray-300 font-mono text-xs">
                      {item.packageId ?? 'N/A'}
                    </td>
                    <td className="py-2 px-2 text-gray-200">
                      {item.productName}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-400">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={quantities[item.id] ?? 0}
                        onChange={(e) =>
                          updateQuantity(item.id, parseFloat(e.target.value) || 0)
                        }
                        min={0}
                        max={item.quantity}
                        step="any"
                        className="w-24 h-8 px-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-50 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TO section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            Target Package
          </h3>
          <div>
            <label className={labelCls}>
              Combine into
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className={selectCls}
            >
              <option value="">Select target package...</option>
              {sourceItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.packageId ?? item.id.slice(0, 8)} - {item.productName} (
                  {item.quantity})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </BaseActionModal>
  )
}
