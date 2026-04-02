'use client'

import { useState, useEffect } from 'react'
import BaseActionModal from './BaseActionModal'
import { SearchableSelect } from '@/components/shared/SearchableSelect'

const inputCls =
  'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'
const selectCls =
  'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

interface SublotRow {
  package_id: string
  quantity: number
  cost: number
}

interface EnhancedSublotModalProps {
  itemId: string
  productName: string
  packageId: string | null
  currentQty: number
  mode?: 'sublot' | 'create_packages'
  onClose: () => void
  onSuccess: () => void
}

export default function EnhancedSublotModal({
  itemId,
  productName,
  packageId,
  currentQty,
  mode = 'sublot',
  onClose,
  onSuccess,
}: EnhancedSublotModalProps) {
  const [packagesToCreate, setPackagesToCreate] = useState(1)
  const [rows, setRows] = useState<SublotRow[]>([
    { package_id: '', quantity: 0, cost: 0 },
  ])
  const [roomId, setRoomId] = useState<string | null>(null)
  const [labelTemplateId, setLabelTemplateId] = useState<string | null>(null)
  const [costDefault, setCostDefault] = useState(0)
  const [bypassBiotrack, setBypassBiotrack] = useState(false)
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([])
  const [labelTemplates, setLabelTemplates] = useState<
    { id: string; name: string; width?: number; height?: number }[]
  >([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    async function fetchLookups() {
      const [roomsRes, templatesRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/labels/templates'),
      ])
      if (roomsRes.ok) setRooms(await roomsRes.json())
      if (templatesRes.ok) setLabelTemplates(await templatesRes.json())
    }
    fetchLookups()
  }, [])

  useEffect(() => {
    setRows((prev) => {
      if (packagesToCreate > prev.length) {
        const additional = Array.from(
          { length: packagesToCreate - prev.length },
          () => ({ package_id: '', quantity: 0, cost: costDefault })
        )
        return [...prev, ...additional]
      }
      return prev.slice(0, packagesToCreate)
    })
  }, [packagesToCreate, costDefault])

  function updateRow(index: number, field: keyof SublotRow, value: string | number) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    )
  }

  function generateSinglePackageId(index: number) {
    if (bypassBiotrack) {
      const uuid = crypto.randomUUID()
      updateRow(index, 'package_id', uuid)
      return
    }
    const ts = Date.now().toString(36).toUpperCase()
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
    updateRow(index, 'package_id', `PKG-${ts}-${rand}`)
  }

  async function generateAllPackageIds() {
    setGenerating(true)
    setRows((prev) =>
      prev.map((r) => {
        if (r.package_id) return r
        if (bypassBiotrack) {
          return { ...r, package_id: crypto.randomUUID() }
        }
        const ts = Date.now().toString(36).toUpperCase()
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
        return { ...r, package_id: `PKG-${ts}-${rand}` }
      })
    )
    setGenerating(false)
  }

  function applyCostDefault() {
    setRows((prev) => prev.map((r) => ({ ...r, cost: costDefault })))
  }

  const totalQty = rows.reduce((sum, r) => sum + r.quantity, 0)
  const allRowsValid = rows.every((r) => r.package_id && r.quantity > 0)
  const submitDisabled = !allRowsValid || totalQty > currentQty

  const roomOptions = rooms.map((r) => ({ value: r.id, label: r.name }))
  const templateOptions = labelTemplates.map((t) => ({
    value: t.id,
    label: t.width && t.height ? `${t.name} (${t.width}x${t.height})` : t.name,
  }))

  const title = mode === 'create_packages' ? 'Create Packages' : 'Create Sublots'

  async function handleSubmit() {
    const res = await fetch('/api/inventory/sublot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        room_id: roomId,
        label_template_id: labelTemplateId,
        sublots: rows.map((r) => ({
          quantity: r.quantity,
          lot_number: r.package_id,
          cost: r.cost,
        })),
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to create sublots')
    }
    onSuccess()
    onClose()
  }

  return (
    <BaseActionModal
      title={title}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={title}
      submitDisabled={submitDisabled}
      wide
    >
      <div className="space-y-5">
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
            <span className="text-gray-400">Available Quantity</span>
            <span className="text-gray-200">{currentQty}</span>
          </div>
        </div>

        {/* Configuration */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            Configuration
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Packages to Create</label>
              <input
                type="number"
                value={packagesToCreate}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v) && v >= 1) setPackagesToCreate(v)
                }}
                min={1}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Default Cost ($)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={costDefault}
                  onChange={(e) => setCostDefault(parseFloat(e.target.value) || 0)}
                  min={0}
                  step="0.01"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={applyCostDefault}
                  className="shrink-0 px-3 h-10 text-xs font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Room</label>
              <SearchableSelect
                options={roomOptions}
                value={roomId}
                onChange={setRoomId}
                placeholder="Select room..."
                searchPlaceholder="Search rooms..."
                emptyMessage="No rooms found"
              />
            </div>
            <div>
              <label className={labelCls}>Label Template</label>
              <SearchableSelect
                options={templateOptions}
                value={labelTemplateId}
                onChange={setLabelTemplateId}
                placeholder="Select template..."
                searchPlaceholder="Search templates..."
                emptyMessage="No templates found"
              />
            </div>
          </div>
        </div>

        {/* Bypass checkbox */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={bypassBiotrack}
            onChange={(e) => setBypassBiotrack(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-300">
            Bypass state system (use internal UUIDs)
          </span>
        </label>

        {/* Generate all button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={generateAllPackageIds}
            disabled={generating}
            className="px-3 py-1.5 text-xs font-medium bg-emerald-700 text-emerald-100 rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            {generating ? 'Generating...' : 'Generate All Package IDs'}
          </button>
        </div>

        {/* Dynamic table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-400 uppercase w-12">
                  #
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-gray-400 uppercase">
                  Package ID
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-400 uppercase w-28">
                  Quantity
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-gray-400 uppercase w-28">
                  Cost ($)
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-700/50">
                  <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={row.package_id}
                        onChange={(e) =>
                          updateRow(i, 'package_id', e.target.value)
                        }
                        placeholder="Package ID"
                        className="flex-1 h-8 px-2 bg-gray-900 border border-gray-600 rounded text-xs text-gray-50 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      {!bypassBiotrack && (
                        <button
                          type="button"
                          onClick={() => generateSinglePackageId(i)}
                          className="shrink-0 px-2 h-8 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                        >
                          Gen
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) =>
                        updateRow(i, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      min={0}
                      step="any"
                      className="w-full h-8 px-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-50 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={row.cost}
                      onChange={(e) =>
                        updateRow(i, 'cost', parseFloat(e.target.value) || 0)
                      }
                      min={0}
                      step="0.01"
                      className="w-full h-8 px-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-50 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total row */}
        <div className="flex justify-between items-center text-sm px-2">
          <span className="text-gray-400">
            Total: {totalQty} / {currentQty}
          </span>
          {totalQty > currentQty && (
            <span className="text-red-400">
              Exceeds available quantity by {(totalQty - currentQty).toFixed(3)}
            </span>
          )}
        </div>
      </div>
    </BaseActionModal>
  )
}
