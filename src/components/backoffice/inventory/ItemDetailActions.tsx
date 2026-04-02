'use client'

import { useState, useEffect, useRef } from 'react'
import { SearchableSelect } from '@/components/shared'
import AssignVendorModal from './modals/AssignVendorModal'
import ChangeProductModal from './modals/ChangeProductModal'
import AssignBatchModal from './modals/AssignBatchModal'
import ConvertModal from './modals/ConvertModal'
import CombineModal from './modals/CombineModal'
import LabSampleModal from './modals/LabSampleModal'
import AuditPackagesModal from './modals/AuditPackagesModal'
import EnhancedDestroyModal from './modals/EnhancedDestroyModal'
import EnhancedSublotModal from './modals/EnhancedSublotModal'
import EnhancedPrintLabelsModal from './modals/EnhancedPrintLabelsModal'
import TransactionsModal from './TransactionsModal'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LookupOption {
  id: string
  name: string
}

interface InventoryItemData {
  id: string
  quantity: number
  quantity_reserved: number | null
  room_id: string | null
  subroom_id: string | null
  status: string | null
  vendor_id: string | null
  batch_id: string | null
  biotrack_barcode: string | null
  is_active: boolean
  rooms: { id: string; name: string } | null
  vendors?: { id: string; name: string } | null
  products: {
    id: string
    name: string
    sku: string | null
    brands: { id: string; name: string } | null
    product_categories: { id: string; name: string } | null
  } | null
}

interface ItemDetailActionsProps {
  itemId: string
  item: InventoryItemData
  onUpdate: () => void
}

type ActiveModal =
  | null
  | 'adjust'
  | 'move'
  | 'assign-status'
  | 'assign-vendor'
  | 'change-product'
  | 'assign-batch'
  | 'convert'
  | 'combine'
  | 'sublot'
  | 'create-packages'
  | 'destroy'
  | 'lab-sample'
  | 'print-labels'
  | 'transactions'
  | 'audit'

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const selectCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'
const btnPrimary = 'px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors'
const btnSecondary = 'px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors'

/* ------------------------------------------------------------------ */
/*  Modal Shell                                                        */
/* ------------------------------------------------------------------ */

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
            <h2 className="text-lg font-semibold text-gray-50">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Adjust Modal (inline — kept for simplicity)                        */
/* ------------------------------------------------------------------ */

function AdjustModal({
  itemId,
  currentQty,
  onClose,
  onSuccess,
}: {
  itemId: string
  currentQty: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [adjustmentType, setAdjustmentType] = useState<'set' | 'increase' | 'decrease'>('set')
  const [quantity, setQuantity] = useState(String(currentQty))
  const [reasonId, setReasonId] = useState('')
  const [notes, setNotes] = useState('')
  const [reasons, setReasons] = useState<Array<{ id: string; name: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/adjustment-reasons')
      .then(r => r.json())
      .then(d => {
        const list = d.reasons ?? d.data ?? []
        setReasons(list.map((r: string | { id: string; name: string }) =>
          typeof r === 'string' ? { id: r, name: r } : r
        ))
      })
  }, [])

  function computeNewQty(): number {
    const val = parseFloat(quantity)
    if (isNaN(val)) return currentQty
    switch (adjustmentType) {
      case 'set': return val
      case 'increase': return currentQty + val
      case 'decrease': return currentQty - val
    }
  }

  async function handleSubmit() {
    const newQty = computeNewQty()
    if (newQty < 0) { setError('Quantity cannot be negative'); return }
    if (newQty === currentQty) { setError('No change'); return }
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/inventory/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inventory_item_id: itemId,
        new_quantity: newQty,
        reason_id: reasonId || null,
        reason: reasonId || null,
        notes: notes || null,
      }),
    })
    if (res.ok) {
      onSuccess()
      onClose()
    } else {
      const err = await res.json().catch(() => null)
      setError(err?.error ?? 'Adjustment failed')
    }
    setSubmitting(false)
  }

  return (
    <ModalShell title="Adjust Quantity" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Current Quantity</label>
          <input type="text" value={String(currentQty)} disabled className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Adjustment Type</label>
          <div className="flex gap-4 mt-1">
            {(['set', 'increase', 'decrease'] as const).map(t => (
              <label key={t} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="adjustmentType"
                  checked={adjustmentType === t}
                  onChange={() => { setAdjustmentType(t); setQuantity('') }}
                  className="text-emerald-500 focus:ring-emerald-500"
                />
                {t === 'set' ? 'Set to exact' : t === 'increase' ? 'Increase by' : 'Decrease by'}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Quantity</label>
          <input
            type="number"
            step="0.001"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className={inputCls}
            autoFocus
          />
          {quantity && (
            <p className="mt-1 text-xs text-gray-400">
              New quantity: <strong className="text-gray-200">{computeNewQty().toFixed(3)}</strong>
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Reason</label>
          <select value={reasonId} onChange={e => setReasonId(e.target.value)} className={selectCls}>
            <option value="">Select reason...</option>
            {reasons.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            placeholder="Optional notes..."
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !quantity} className={btnPrimary}>
            {submitting ? 'Adjusting...' : 'Adjust'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ------------------------------------------------------------------ */
/*  Move Modal (inline)                                                */
/* ------------------------------------------------------------------ */

function MoveModal({
  itemId,
  currentRoom,
  onClose,
  onSuccess,
}: {
  itemId: string
  currentRoom: string | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [roomId, setRoomId] = useState<string | null>(null)
  const [subroomId, setSubroomId] = useState<string | null>(null)
  const [rooms, setRooms] = useState<LookupOption[]>([])
  const [subrooms, setSubrooms] = useState<LookupOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/rooms').then(r => r.json()).then(d => setRooms(d.rooms ?? d.data ?? []))
    fetch('/api/subrooms').then(r => r.json()).then(d => setSubrooms(d.subrooms ?? d.data ?? []))
  }, [])

  async function handleSubmit() {
    if (!roomId) return
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/inventory/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, subroom_id: subroomId }),
    })
    if (res.ok) {
      onSuccess()
      onClose()
    } else {
      const err = await res.json().catch(() => null)
      setError(err?.error ?? 'Move failed')
    }
    setSubmitting(false)
  }

  return (
    <ModalShell title="Move Item" onClose={onClose}>
      <div className="space-y-4">
        {currentRoom && (
          <div>
            <label className={labelCls}>Current Room</label>
            <input type="text" value={currentRoom} disabled className={inputCls} />
          </div>
        )}
        <div>
          <label className={labelCls}>Destination Room</label>
          <SearchableSelect
            options={rooms.map(r => ({ value: r.id, label: r.name }))}
            value={roomId}
            onChange={setRoomId}
            placeholder="Select room..."
          />
        </div>
        <div>
          <label className={labelCls}>Subroom</label>
          <SearchableSelect
            options={subrooms.map(s => ({ value: s.id, label: s.name }))}
            value={subroomId}
            onChange={setSubroomId}
            placeholder="Select subroom (optional)..."
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !roomId} className={btnPrimary}>
            {submitting ? 'Moving...' : 'Move'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ------------------------------------------------------------------ */
/*  Assign Status Modal (inline)                                       */
/* ------------------------------------------------------------------ */

function AssignStatusModal({
  itemId,
  currentStatus,
  onClose,
  onSuccess,
}: {
  itemId: string
  currentStatus: string | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [newStatus, setNewStatus] = useState(currentStatus ?? '')
  const [reason, setReason] = useState('')
  const [statuses, setStatuses] = useState<Array<{ value: string; label: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/inventory-statuses')
      .then(r => r.json())
      .then(d => {
        const list = d.statuses ?? d.data ?? []
        setStatuses(list.map((s: string | { value: string; label: string }) =>
          typeof s === 'string' ? { value: s, label: s } : s
        ))
      })
  }, [])

  const isHoldStatus = ['quarantine', 'on_hold', 'held'].includes(newStatus)

  async function handleSubmit() {
    if (!newStatus) return
    setSubmitting(true)
    setError(null)
    const body: Record<string, unknown> = { testing_status: newStatus }
    if (isHoldStatus && reason) {
      body.hold_reason = reason
      body.is_on_hold = true
    }
    const res = await fetch(`/api/inventory/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      onSuccess()
      onClose()
    } else {
      const err = await res.json().catch(() => null)
      setError(err?.error ?? 'Status update failed')
    }
    setSubmitting(false)
  }

  return (
    <ModalShell title="Assign Status" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Current Status</label>
          <input type="text" value={currentStatus ?? 'None'} disabled className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>New Status</label>
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className={selectCls}>
            <option value="">Select status...</option>
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {isHoldStatus && (
          <div>
            <label className={labelCls}>Reason</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder="Reason for hold..."
            />
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !newStatus} className={btnPrimary}>
            {submitting ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Actions Dropdown                                              */
/* ------------------------------------------------------------------ */

export default function ItemDetailActions({ itemId, item, onUpdate }: ItemDetailActionsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function openAction(modal: ActiveModal) {
    setDropdownOpen(false)
    setActiveModal(modal)
  }

  function closeModal() {
    setActiveModal(null)
  }

  function handleSuccess() {
    closeModal()
    onUpdate()
  }

  const productName = item.products?.name ?? 'Unknown Item'
  const currentProduct = item.products ? {
    id: item.products.id,
    name: item.products.name,
    sku: item.products.sku,
    brand: item.products.brands?.name ?? null,
    category: item.products.product_categories?.name ?? null,
  } : null

  const actions: Array<{ label: string; action: () => void; danger?: boolean; separator?: boolean }> = [
    { label: 'Adjust', action: () => openAction('adjust') },
    { label: 'Move', action: () => openAction('move') },
    { label: 'Assign Status', action: () => openAction('assign-status') },
    { label: 'Assign Vendor', action: () => openAction('assign-vendor') },
    { label: 'Change Product', action: () => openAction('change-product') },
    { label: 'Assign Batch', action: () => openAction('assign-batch') },
    { label: 'Convert', action: () => openAction('convert') },
    { label: 'Combine', action: () => openAction('combine') },
    { label: 'Sublot', action: () => openAction('sublot') },
    { label: 'Create Packages', action: () => openAction('create-packages') },
    { label: 'Lab Sample', action: () => openAction('lab-sample') },
    { label: 'Print Labels', action: () => openAction('print-labels') },
    { label: 'Transactions', action: () => openAction('transactions'), separator: true },
    { label: 'Audit Package', action: () => openAction('audit') },
    { label: 'Destroy', action: () => openAction('destroy'), danger: true, separator: true },
  ]

  return (
    <>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className="px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-1"
        >
          Actions
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-40 py-1 max-h-80 overflow-y-auto">
            {actions.map((a, idx) => (
              <div key={a.label}>
                {a.separator && idx > 0 && <hr className="border-gray-700 my-1" />}
                <button
                  onClick={a.action}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                    a.danger ? 'text-red-400 hover:text-red-300' : 'text-gray-300 hover:text-gray-100'
                  }`}
                >
                  {a.label}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inline modals */}
      {activeModal === 'adjust' && (
        <AdjustModal
          itemId={itemId}
          currentQty={item.quantity}
          onClose={closeModal}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'move' && (
        <MoveModal
          itemId={itemId}
          currentRoom={item.rooms?.name ?? null}
          onClose={closeModal}
          onSuccess={onUpdate}
        />
      )}
      {activeModal === 'assign-status' && (
        <AssignStatusModal
          itemId={itemId}
          currentStatus={item.status}
          onClose={closeModal}
          onSuccess={onUpdate}
        />
      )}

      {/* Imported modals */}
      {activeModal === 'assign-vendor' && (
        <AssignVendorModal
          itemId={itemId}
          currentVendorName={item.vendors?.name ?? null}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === 'change-product' && (
        <ChangeProductModal
          itemId={itemId}
          currentProduct={currentProduct}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === 'assign-batch' && (
        <AssignBatchModal
          itemId={itemId}
          currentBatch={item.batch_id ?? null}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === 'convert' && (
        <ConvertModal
          itemId={itemId}
          productName={productName}
          packageId={item.biotrack_barcode ?? null}
          currentQty={item.quantity}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === 'combine' && (
        <CombineModal
          sourceItems={[{
            id: item.id,
            productName,
            packageId: item.biotrack_barcode ?? null,
            quantity: item.quantity,
          }]}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === 'sublot' && (
        <EnhancedSublotModal
          itemId={itemId}
          productName={productName}
          packageId={item.biotrack_barcode ?? null}
          currentQty={item.quantity}
          mode="sublot"
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === 'create-packages' && (
        <EnhancedSublotModal
          itemId={itemId}
          productName={productName}
          packageId={item.biotrack_barcode ?? null}
          currentQty={item.quantity}
          mode="create_packages"
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === 'destroy' && (
        <EnhancedDestroyModal
          itemId={itemId}
          productName={productName}
          packageId={item.biotrack_barcode ?? null}
          currentQty={item.quantity}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === 'lab-sample' && (
        <LabSampleModal
          itemId={itemId}
          productName={productName}
          packageId={item.biotrack_barcode ?? null}
          currentQty={item.quantity}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === 'print-labels' && (
        <EnhancedPrintLabelsModal
          itemIds={[itemId]}
          productName={productName}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === 'transactions' && (
        <TransactionsModal
          itemId={itemId}
          onClose={closeModal}
        />
      )}
      {activeModal === 'audit' && (
        <AuditPackagesModal
          itemIds={[itemId]}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
