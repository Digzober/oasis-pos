'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'
import TransactionsModal from '@/components/backoffice/inventory/TransactionsModal'
import EnhancedSublotModal from '@/components/backoffice/inventory/modals/EnhancedSublotModal'
import ConvertModal from '@/components/backoffice/inventory/modals/ConvertModal'
import CombineModal from '@/components/backoffice/inventory/modals/CombineModal'
import AuditPackagesModal from '@/components/backoffice/inventory/modals/AuditPackagesModal'
import EnhancedDestroyModal from '@/components/backoffice/inventory/modals/EnhancedDestroyModal'
import EnhancedPrintLabelsModal from '@/components/backoffice/inventory/modals/EnhancedPrintLabelsModal'
import AssignVendorModal from '@/components/backoffice/inventory/modals/AssignVendorModal'
import ChangeProductModal from '@/components/backoffice/inventory/modals/ChangeProductModal'
import AssignBatchModal from '@/components/backoffice/inventory/modals/AssignBatchModal'
import LabSampleModal from '@/components/backoffice/inventory/modals/LabSampleModal'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LookupOption {
  id: string
  name: string
}

interface InventoryProduct {
  id: string
  name: string
  sku: string | null
  rec_price: number | null
  med_price: number | null
  thc_percentage: number | null
  cbd_percentage: number | null
  thc_content_mg: number | null
  flower_equivalent: number | null
  brands: { id: string; name: string } | null
  vendors: { id: string; name: string } | null
  strains: { id: string; name: string } | null
  product_categories: { id: string; name: string } | null
}

interface InvItem {
  id: string
  product_id: string | null
  biotrack_barcode: string | null
  batch_id: string | null
  quantity: number
  quantity_reserved: number | null
  cost_per_unit: number | null
  received_at: string | null
  expiration_date: string | null
  testing_status: string | null
  is_on_hold: boolean | null
  flower_equivalent_grams: number | null
  vendor_id: string | null
  status: string | null
  products: InventoryProduct | null
  rooms: { id: string; name: string } | null
}

interface PaginationInfo {
  page: number
  per_page: number
  total: number
  total_pages: number
}

type SortDir = 'asc' | 'desc'

interface ColumnDef {
  key: string
  label: string
  sortKey?: string
  sortable: boolean
  defaultVisible: boolean
  align: 'left' | 'right'
}

interface ActiveFilter {
  key: string
  label: string
  valueLabel: string
}

/* ------------------------------------------------------------------ */
/*  Column Definitions                                                 */
/* ------------------------------------------------------------------ */

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'sku', label: 'SKU', sortKey: 'sku', sortable: true, defaultVisible: true, align: 'left' },
  { key: 'product', label: 'Product', sortKey: 'product_name', sortable: true, defaultVisible: true, align: 'left' },
  { key: 'brand', label: 'Brand', sortKey: 'brand_name', sortable: true, defaultVisible: true, align: 'left' },
  { key: 'available', label: 'Available', sortKey: 'quantity', sortable: true, defaultVisible: true, align: 'right' },
  { key: 'reserved', label: 'Reserved', sortable: false, defaultVisible: false, align: 'right' },
  { key: 'room', label: 'Room', sortKey: 'room_name', sortable: true, defaultVisible: true, align: 'left' },
  { key: 'cost', label: 'Cost', sortKey: 'cost_per_unit', sortable: true, defaultVisible: true, align: 'right' },
  { key: 'rec_price', label: 'Rec Price', sortKey: 'rec_price', sortable: true, defaultVisible: true, align: 'right' },
  { key: 'med_price', label: 'Med Price', sortable: false, defaultVisible: false, align: 'right' },
  { key: 'thc_pct', label: 'THC %', sortKey: 'thc_percentage', sortable: true, defaultVisible: true, align: 'right' },
  { key: 'cbd_pct', label: 'CBD %', sortable: false, defaultVisible: false, align: 'right' },
  { key: 'thc_mg', label: 'THC mg', sortable: false, defaultVisible: false, align: 'right' },
  { key: 'category', label: 'Category', sortable: false, defaultVisible: false, align: 'left' },
  { key: 'vendor', label: 'Vendor', sortable: false, defaultVisible: false, align: 'left' },
  { key: 'strain', label: 'Strain', sortable: false, defaultVisible: false, align: 'left' },
  { key: 'expiration', label: 'Expiration', sortKey: 'expiration_date', sortable: true, defaultVisible: true, align: 'left' },
  { key: 'received', label: 'Received', sortKey: 'received_at', sortable: true, defaultVisible: true, align: 'left' },
  { key: 'package_id', label: 'Package ID', sortable: false, defaultVisible: true, align: 'left' },
  { key: 'batch', label: 'Batch', sortKey: 'batch_id', sortable: true, defaultVisible: false, align: 'left' },
  { key: 'testing', label: 'Testing', sortKey: 'testing_status', sortable: true, defaultVisible: true, align: 'left' },
  { key: 'flower_eq', label: 'Flower Eq', sortable: false, defaultVisible: false, align: 'right' },
  { key: 'on_hold', label: 'On Hold', sortable: false, defaultVisible: false, align: 'left' },
  { key: 'actions', label: '', sortable: false, defaultVisible: true, align: 'right' },
]

const STORAGE_KEY = 'inventory-columns-config'

function loadColumnVisibility(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, boolean>
  } catch { /* use defaults */ }
  return {}
}

function saveColumnVisibility(vis: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vis))
  } catch { /* storage full or unavailable */ }
}

function getInitialVisibility(): Record<string, boolean> {
  const saved = loadColumnVisibility()
  const result: Record<string, boolean> = {}
  for (const col of ALL_COLUMNS) {
    result[col.key] = saved[col.key] !== undefined ? Boolean(saved[col.key]) : col.defaultVisible
  }
  return result
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  return `${n.toFixed(1)}%`
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '\u2014'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtQty(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  return Number.isInteger(n) ? String(n) : n.toFixed(3)
}

function statusBadge(status: string | null): { label: string; cls: string } {
  switch (status) {
    case 'passed': return { label: 'Passed', cls: 'bg-emerald-900/50 text-emerald-400 border-emerald-700' }
    case 'failed': return { label: 'Failed', cls: 'bg-red-900/50 text-red-400 border-red-700' }
    case 'pending': return { label: 'Pending', cls: 'bg-amber-900/50 text-amber-400 border-amber-700' }
    case 'untested': return { label: 'Untested', cls: 'bg-gray-700/50 text-gray-300 border-gray-600' }
    default: return { label: '\u2014', cls: '' }
  }
}

function isBarcodeScan(value: string): boolean {
  return /^\d{12,16}$/.test(value.trim())
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/* ------------------------------------------------------------------ */
/*  Icons (inline SVG to avoid external deps)                          */
/* ------------------------------------------------------------------ */

function IconPackage() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

function IconDollar() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function IconChevronUp() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconX() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconDots() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Summary Card                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({ label, value, color, icon }: {
  label: string
  value: string
  color?: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-gray-700/50 text-gray-400 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 tabular-nums ${color ?? 'text-gray-50'}`}>{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Filter Dropdown                                                    */
/* ------------------------------------------------------------------ */

function FilterDropdown({ label, options, value, onChange }: {
  label: string
  options: LookupOption[]
  value: string
  onChange: (val: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none cursor-pointer min-w-[140px]"
    >
      <option value="">{label}</option>
      {options.map(o => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  )
}

/* ------------------------------------------------------------------ */
/*  Bulk Action Modal Wrapper                                          */
/* ------------------------------------------------------------------ */

function Modal({ title, open, onClose, children }: {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-50">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <IconX />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Move Modal                                                         */
/* ------------------------------------------------------------------ */

function MoveModal({ open, onClose, rooms, selectedIds, onSuccess }: {
  open: boolean
  onClose: () => void
  rooms: LookupOption[]
  selectedIds: string[]
  onSuccess: () => void
}) {
  const [roomId, setRoomId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!roomId) return
    setSaving(true)
    const res = await fetch('/api/inventory/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', item_ids: selectedIds, room_id: roomId }),
    })
    setSaving(false)
    if (res.ok) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Modal title={`Move ${selectedIds.length} Item(s)`} open={open} onClose={onClose}>
      <label className="block text-sm text-gray-400 mb-1">Destination Room</label>
      <select
        value={roomId}
        onChange={e => setRoomId(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm mb-4"
      >
        <option value="">Select room...</option>
        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
        <button onClick={handleSubmit} disabled={!roomId || saving} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg">
          {saving ? 'Moving...' : 'Move'}
        </button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Assign Status Modal                                                */
/* ------------------------------------------------------------------ */

function AssignStatusModal({ open, onClose, selectedIds, onSuccess }: {
  open: boolean
  onClose: () => void
  selectedIds: string[]
  onSuccess: () => void
}) {
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const statuses = [
    { id: 'passed', name: 'Passed' },
    { id: 'failed', name: 'Failed' },
    { id: 'pending', name: 'Pending' },
    { id: 'untested', name: 'Untested' },
  ]

  const handleSubmit = async () => {
    if (!status) return
    setSaving(true)
    const res = await fetch('/api/inventory/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assign_status', item_ids: selectedIds, status }),
    })
    setSaving(false)
    if (res.ok) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Modal title={`Assign Status to ${selectedIds.length} Item(s)`} open={open} onClose={onClose}>
      <label className="block text-sm text-gray-400 mb-1">Testing Status</label>
      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm mb-4"
      >
        <option value="">Select status...</option>
        {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
        <button onClick={handleSubmit} disabled={!status || saving} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg">
          {saving ? 'Saving...' : 'Assign'}
        </button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Change Vendor Modal                                                */
/* ------------------------------------------------------------------ */

function ChangeVendorModal({ open, onClose, vendors, selectedIds, onSuccess }: {
  open: boolean
  onClose: () => void
  vendors: LookupOption[]
  selectedIds: string[]
  onSuccess: () => void
}) {
  const [vendorId, setVendorId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!vendorId) return
    setSaving(true)
    const res = await fetch('/api/inventory/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_vendor', item_ids: selectedIds, vendor_id: vendorId }),
    })
    setSaving(false)
    if (res.ok) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Modal title={`Change Vendor for ${selectedIds.length} Item(s)`} open={open} onClose={onClose}>
      <label className="block text-sm text-gray-400 mb-1">New Vendor</label>
      <select
        value={vendorId}
        onChange={e => setVendorId(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm mb-4"
      >
        <option value="">Select vendor...</option>
        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
        <button onClick={handleSubmit} disabled={!vendorId || saving} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg">
          {saving ? 'Saving...' : 'Change Vendor'}
        </button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Adjust Modal                                                       */
/* ------------------------------------------------------------------ */

function AdjustModal({ open, onClose, selectedIds, onSuccess }: {
  open: boolean
  onClose: () => void
  selectedIds: string[]
  onSuccess: () => void
}) {
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const reasons = ['Damage', 'Miscount', 'Theft', 'Audit', 'Spoilage', 'Other']

  const handleSubmit = async () => {
    const numDelta = parseFloat(delta)
    if (isNaN(numDelta) || numDelta === 0 || !reason) return
    setSaving(true)
    const res = await fetch('/api/inventory/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adjust', item_ids: selectedIds, quantity_delta: numDelta, reason, notes }),
    })
    setSaving(false)
    if (res.ok) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Modal title={`Adjust ${selectedIds.length} Item(s)`} open={open} onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Quantity Change (+/-)</label>
          <input
            type="number"
            step="any"
            value={delta}
            onChange={e => setDelta(e.target.value)}
            placeholder="e.g. -1 or +5"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Reason</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm"
          >
            <option value="">Select reason...</option>
            {reasons.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm resize-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
        <button onClick={handleSubmit} disabled={!delta || !reason || saving} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg">
          {saving ? 'Adjusting...' : 'Adjust'}
        </button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Destroy (Deactivate) Modal                                         */
/* ------------------------------------------------------------------ */

function DestroyModal({ open, onClose, selectedIds, onSuccess }: {
  open: boolean
  onClose: () => void
  selectedIds: string[]
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleSubmit = async () => {
    if (confirmText !== 'DESTROY') return
    setSaving(true)
    const res = await fetch('/api/inventory/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'destroy', item_ids: selectedIds }),
    })
    setSaving(false)
    if (res.ok) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Modal title={`Destroy ${selectedIds.length} Item(s)`} open={open} onClose={onClose}>
      <p className="text-sm text-gray-400 mb-3">
        This will deactivate the selected inventory items. This action cannot be undone.
      </p>
      <label className="block text-sm text-gray-400 mb-1">Type DESTROY to confirm</label>
      <input
        value={confirmText}
        onChange={e => setConfirmText(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm mb-4"
        placeholder="DESTROY"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
        <button onClick={handleSubmit} disabled={confirmText !== 'DESTROY' || saving} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg">
          {saving ? 'Destroying...' : 'Destroy'}
        </button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  Edit Tags Modal (bulk)                                             */
/* ------------------------------------------------------------------ */

function EditTagsModal({ selectedIds, onClose, onSuccess }: {
  selectedIds: string[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [addTags, setAddTags] = useState<string[]>([])
  const [removeTags, setRemoveTags] = useState<string[]>([])
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/tags?type=inventory').then(r => r.json()).then(d => setTags(d.tags ?? d.data ?? []))
  }, [])

  const handleSubmit = async () => {
    if (addTags.length === 0 && removeTags.length === 0) return
    setSaving(true)
    const res = await fetch('/api/inventory/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit_tags', item_ids: selectedIds, add_tags: addTags, remove_tags: removeTags }),
    })
    setSaving(false)
    if (res.ok) {
      onSuccess()
      onClose()
    }
  }

  const toggleTag = (tagId: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(tagId) ? list.filter(id => id !== tagId) : [...list, tagId])
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-50">Edit Tags ({selectedIds.length} items)</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Add Tags</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {tags.map(tag => (
                  <button
                    key={`add-${tag.id}`}
                    onClick={() => toggleTag(tag.id, addTags, setAddTags)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      addTags.includes(tag.id)
                        ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700'
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Remove Tags</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {tags.map(tag => (
                  <button
                    key={`rm-${tag.id}`}
                    onClick={() => toggleTag(tag.id, removeTags, setRemoveTags)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      removeTags.includes(tag.id)
                        ? 'bg-red-900/50 text-red-300 border-red-700'
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={saving || (addTags.length === 0 && removeTags.length === 0)}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg"
            >
              {saving ? 'Saving...' : 'Apply Tags'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function InventoryListPage() {
  const { locationId, hydrated } = useSelectedLocation()

  /* --- State: Data --- */
  const [items, setItems] = useState<InvItem[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, per_page: 50, total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(true)

  /* --- State: Filters --- */
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [testingFilter, setTestingFilter] = useState('')
  const [onHoldFilter, setOnHoldFilter] = useState('')

  /* --- State: Sort & Pagination --- */
  const [sortBy, setSortBy] = useState('received_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)

  /* --- State: Selection --- */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  /* --- State: Column Config --- */
  const [colVis, setColVis] = useState<Record<string, boolean>>(getInitialVisibility)
  const [showColConfig, setShowColConfig] = useState(false)

  /* --- State: Lookup Options --- */
  const [rooms, setRooms] = useState<LookupOption[]>([])
  const [brands, setBrands] = useState<LookupOption[]>([])
  const [vendors, setVendors] = useState<LookupOption[]>([])
  const [categories, setCategories] = useState<LookupOption[]>([])

  /* --- State: Modals --- */
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showDestroyModal, setShowDestroyModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [showBulkDropdown, setShowBulkDropdown] = useState(false)
  const [showEditTagsModal, setShowEditTagsModal] = useState(false)
  const [showCombineModal, setShowCombineModal] = useState(false)
  const [showSublotModal, setShowSublotModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [showTransactionsModal, setShowTransactionsModal] = useState(false)
  const [showAssignVendorModal, setShowAssignVendorModal] = useState(false)
  const [showChangeProductModal, setShowChangeProductModal] = useState(false)
  const [showAssignBatchModal, setShowAssignBatchModal] = useState(false)
  const [showLabSampleModal, setShowLabSampleModal] = useState(false)
  const [singleActionItem, setSingleActionItem] = useState<InvItem | null>(null)

  /* --- State: Row Action Menus --- */
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null)

  /* --- Refs --- */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colConfigRef = useRef<HTMLDivElement>(null)
  const actionsDropRef = useRef<HTMLDivElement>(null)
  const bulkDropRef = useRef<HTMLDivElement>(null)

  /* --- Visible columns --- */
  const visibleColumns = useMemo(() =>
    ALL_COLUMNS.filter(c => colVis[c.key] !== false),
    [colVis]
  )

  /* --- Active filter chips --- */
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = []
    if (roomFilter) {
      const r = rooms.find(x => x.id === roomFilter)
      chips.push({ key: 'room', label: 'Room', valueLabel: r?.name ?? roomFilter })
    }
    if (brandFilter) {
      const b = brands.find(x => x.id === brandFilter)
      chips.push({ key: 'brand', label: 'Brand', valueLabel: b?.name ?? brandFilter })
    }
    if (vendorFilter) {
      const v = vendors.find(x => x.id === vendorFilter)
      chips.push({ key: 'vendor', label: 'Vendor', valueLabel: v?.name ?? vendorFilter })
    }
    if (categoryFilter) {
      const c = categories.find(x => x.id === categoryFilter)
      chips.push({ key: 'category', label: 'Category', valueLabel: c?.name ?? categoryFilter })
    }
    if (testingFilter) {
      chips.push({ key: 'testing', label: 'Testing', valueLabel: testingFilter })
    }
    if (onHoldFilter) {
      chips.push({ key: 'on_hold', label: 'On Hold', valueLabel: onHoldFilter === 'true' ? 'Yes' : 'No' })
    }
    return chips
  }, [roomFilter, brandFilter, vendorFilter, categoryFilter, testingFilter, onHoldFilter, rooms, brands, vendors, categories])

  /* --- Summary stats computed from pagination total + items on page --- */
  const summaryStats = useMemo(() => {
    let totalValue = 0
    let lowStock = 0
    let onHold = 0
    for (const item of items) {
      const cost = item.cost_per_unit ?? 0
      totalValue += cost * item.quantity
      if (item.quantity > 0 && item.quantity <= 5) lowStock++
      if (item.is_on_hold) onHold++
    }
    return { totalItems: pagination.total, totalValue, lowStock, onHold }
  }, [items, pagination.total])

  /* --- Fetch filter options on mount --- */
  useEffect(() => {
    const fetchOptions = async () => {
      const opts = { cache: 'no-store' as const }
      const [roomsRes, brandsRes, vendorsRes, catsRes] = await Promise.all([
        fetch('/api/rooms', opts).then(r => r.ok ? r.json() : { rooms: [] }).catch(() => ({ rooms: [] })),
        fetch('/api/brands', opts).then(r => r.ok ? r.json() : { brands: [] }).catch(() => ({ brands: [] })),
        fetch('/api/vendors', opts).then(r => r.ok ? r.json() : { vendors: [] }).catch(() => ({ vendors: [] })),
        fetch('/api/categories', opts).then(r => r.ok ? r.json() : { categories: [] }).catch(() => ({ categories: [] })),
      ])
      setRooms((roomsRes.rooms ?? []).map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })))
      setBrands((brandsRes.brands ?? []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })))
      setVendors((vendorsRes.vendors ?? []).map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })))
      setCategories((catsRes.categories ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
    }
    fetchOptions()
  }, [])

  /* --- Fetch inventory data --- */
  const fetchInventory = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (locationId) params.set('location_id', locationId)
    params.set('page', String(page))
    params.set('per_page', String(perPage))
    if (search) params.set('search', search)
    params.set('sort_by', sortBy)
    params.set('sort_dir', sortDir)
    if (roomFilter) params.set('room_id', roomFilter)
    if (brandFilter) params.set('brand_id', brandFilter)
    if (vendorFilter) params.set('vendor_id', vendorFilter)
    if (categoryFilter) params.set('category_id', categoryFilter)
    if (testingFilter) params.set('testing_status', testingFilter)
    if (onHoldFilter) params.set('on_hold', onHoldFilter)

    try {
      const res = await fetch(`/api/inventory?${params.toString()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setItems(data.items ?? [])
        setPagination(data.pagination ?? { page: 1, per_page: perPage, total: 0, total_pages: 0 })
      }
    } catch {
      /* network error — keep current state */
    }
    setLoading(false)
  }, [locationId, page, perPage, search, sortBy, sortDir, roomFilter, brandFilter, vendorFilter, categoryFilter, testingFilter, onHoldFilter])

  useEffect(() => {
    if (hydrated) fetchInventory()
  }, [hydrated, fetchInventory])

  /* --- Debounced search input --- */
  const handleSearchInput = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (isBarcodeScan(value)) {
      setSearch(value.trim())
      setPage(1)
      return
    }

    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }, [])

  /* --- Sort toggle --- */
  const handleSort = useCallback((colKey: string) => {
    const col = ALL_COLUMNS.find(c => c.key === colKey)
    if (!col?.sortable || !col.sortKey) return
    if (sortBy === col.sortKey) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col.sortKey)
      setSortDir('asc')
    }
    setPage(1)
  }, [sortBy])

  /* --- Selection --- */
  const allOnPageSelected = items.length > 0 && items.every(i => selectedIds.has(i.id))

  const toggleSelectAll = useCallback(() => {
    if (allOnPageSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(i => i.id)))
    }
  }, [items, allOnPageSelected])

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  /* --- Column visibility --- */
  const toggleColumn = useCallback((key: string) => {
    setColVis(prev => {
      const next = { ...prev, [key]: !prev[key] }
      saveColumnVisibility(next)
      return next
    })
  }, [])

  /* --- Clear single filter --- */
  const clearFilter = useCallback((key: string) => {
    switch (key) {
      case 'room': setRoomFilter(''); break
      case 'brand': setBrandFilter(''); break
      case 'vendor': setVendorFilter(''); break
      case 'category': setCategoryFilter(''); break
      case 'testing': setTestingFilter(''); break
      case 'on_hold': setOnHoldFilter(''); break
    }
    setPage(1)
  }, [])

  /* --- Export CSV --- */
  const exportCSV = useCallback(() => {
    const headers = ['SKU', 'Product', 'Brand', 'Quantity', 'Room', 'Cost', 'Rec Price', 'THC%', 'Expiration', 'Received', 'Package ID', 'Testing']
    const rows = items.map(item => [
      csvEscape(item.products?.sku ?? ''),
      csvEscape(item.products?.name ?? ''),
      csvEscape(item.products?.brands?.name ?? ''),
      String(item.quantity),
      csvEscape(item.rooms?.name ?? ''),
      String(item.cost_per_unit ?? ''),
      String(item.products?.rec_price ?? ''),
      String(item.products?.thc_percentage ?? ''),
      item.expiration_date ?? '',
      item.received_at ?? '',
      csvEscape(item.biotrack_barcode ?? ''),
      item.testing_status ?? '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [items])

  /* --- Export selected CSV --- */
  const exportSelectedCSV = useCallback(() => {
    const selected = items.filter(i => selectedIds.has(i.id))
    const headers = ['SKU', 'Product', 'Brand', 'Quantity', 'Room', 'Cost', 'Rec Price', 'THC%', 'Expiration', 'Received', 'Package ID', 'Testing']
    const rows = selected.map(item => [
      csvEscape(item.products?.sku ?? ''),
      csvEscape(item.products?.name ?? ''),
      csvEscape(item.products?.brands?.name ?? ''),
      String(item.quantity),
      csvEscape(item.rooms?.name ?? ''),
      String(item.cost_per_unit ?? ''),
      String(item.products?.rec_price ?? ''),
      String(item.products?.thc_percentage ?? ''),
      item.expiration_date ?? '',
      item.received_at ?? '',
      csvEscape(item.biotrack_barcode ?? ''),
      item.testing_status ?? '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-selected-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [items, selectedIds])

  /* --- Close dropdowns on outside click --- */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colConfigRef.current && !colConfigRef.current.contains(e.target as Node)) {
        setShowColConfig(false)
      }
      if (actionsDropRef.current && !actionsDropRef.current.contains(e.target as Node)) {
        setShowActionsDropdown(false)
      }
      if (bulkDropRef.current && !bulkDropRef.current.contains(e.target as Node)) {
        setShowBulkDropdown(false)
      }
      // Only close row menu if click is outside any row-actions-menu
      const target = e.target as HTMLElement
      if (!target.closest('[data-row-menu]')) {
        setOpenRowMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  /* --- After bulk action success --- */
  const handleBulkSuccess = useCallback(() => {
    setSelectedIds(new Set())
    fetchInventory()
  }, [fetchInventory])

  /* --- Single item actions --- */
  const handleSingleAction = useCallback((action: string, itemId: string) => {
    setOpenRowMenu(null)
    const targetItem = items.find(i => i.id === itemId) ?? null
    if (!targetItem) return
    setSingleActionItem(targetItem)
    switch (action) {
      case 'adjust': setSelectedIds(new Set([itemId])); setShowAdjustModal(true); break
      case 'move': setSelectedIds(new Set([itemId])); setShowMoveModal(true); break
      case 'status': setSelectedIds(new Set([itemId])); setShowStatusModal(true); break
      case 'print': setShowPrintModal(true); break
      case 'destroy': setShowDestroyModal(true); break
      case 'sublot': setShowSublotModal(true); break
      case 'convert': setShowConvertModal(true); break
      case 'transactions': setShowTransactionsModal(true); break
      case 'assign-vendor': setShowAssignVendorModal(true); break
      case 'change-product': setShowChangeProductModal(true); break
      case 'assign-batch': setShowAssignBatchModal(true); break
      case 'lab-sample': setShowLabSampleModal(true); break
      case 'audit': setShowAuditModal(true); break
    }
  }, [items])

  /* --- Pagination range display --- */
  const showingFrom = pagination.total === 0 ? 0 : (page - 1) * perPage + 1
  const showingTo = Math.min(page * perPage, pagination.total)

  /* --- Render cell content --- */
  const renderCell = useCallback((col: ColumnDef, item: InvItem) => {
    switch (col.key) {
      case 'sku':
        return (
          <Link
            href={`/inventory/items/${item.id}`}
            className="text-emerald-400 hover:text-emerald-300 hover:underline font-mono text-xs"
          >
            {item.products?.sku ?? '\u2014'}
          </Link>
        )
      case 'product':
        return <span className="text-gray-200 text-sm">{item.products?.name ?? '\u2014'}</span>
      case 'brand':
        return <span className="text-gray-300 text-sm">{item.products?.brands?.name ?? '\u2014'}</span>
      case 'available': {
        const isLow = item.quantity > 0 && item.quantity <= 5
        return (
          <span className={`text-sm font-medium tabular-nums ${isLow ? 'text-amber-400' : 'text-gray-200'}`}>
            {fmtQty(item.quantity)}
          </span>
        )
      }
      case 'room':
        return <span className="text-gray-300 text-sm">{item.rooms?.name ?? '\u2014'}</span>
      case 'cost':
        return <span className="text-gray-300 text-sm tabular-nums">{fmt(item.cost_per_unit)}</span>
      case 'rec_price':
        return <span className="text-gray-300 text-sm tabular-nums">{fmt(item.products?.rec_price)}</span>
      case 'med_price':
        return <span className="text-gray-300 text-sm tabular-nums">{fmt(item.products?.med_price)}</span>
      case 'thc_pct':
        return <span className="text-gray-300 text-sm tabular-nums">{fmtPct(item.products?.thc_percentage)}</span>
      case 'cbd_pct':
        return <span className="text-gray-300 text-sm tabular-nums">{fmtPct(item.products?.cbd_percentage)}</span>
      case 'thc_mg':
        return <span className="text-gray-300 text-sm tabular-nums">{item.products?.thc_content_mg != null ? `${item.products.thc_content_mg}mg` : '\u2014'}</span>
      case 'category':
        return <span className="text-gray-300 text-sm">{item.products?.product_categories?.name ?? '\u2014'}</span>
      case 'vendor':
        return <span className="text-gray-300 text-sm">{item.products?.vendors?.name ?? '\u2014'}</span>
      case 'strain':
        return <span className="text-gray-300 text-sm">{item.products?.strains?.name ?? '\u2014'}</span>
      case 'expiration':
        return <span className="text-gray-300 text-sm">{fmtDate(item.expiration_date)}</span>
      case 'received':
        return <span className="text-gray-300 text-sm">{fmtDate(item.received_at)}</span>
      case 'package_id':
        return <span className="text-gray-400 text-xs font-mono truncate max-w-[120px] block">{item.biotrack_barcode ?? '\u2014'}</span>
      case 'batch':
        return <span className="text-gray-400 text-xs font-mono truncate max-w-[100px] block">{item.batch_id ?? '\u2014'}</span>
      case 'reserved':
        return <span className="text-gray-300 text-sm tabular-nums">{fmtQty(item.quantity_reserved)}</span>
      case 'flower_eq':
        return <span className="text-gray-300 text-sm tabular-nums">{item.flower_equivalent_grams != null ? `${item.flower_equivalent_grams}g` : (item.products?.flower_equivalent != null ? `${item.products.flower_equivalent}g` : '\u2014')}</span>
      case 'on_hold':
        return item.is_on_hold
          ? <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full border bg-red-900/50 text-red-400 border-red-700">Hold</span>
          : <span className="text-gray-500 text-sm">\u2014</span>
      case 'testing': {
        const badge = statusBadge(item.testing_status)
        if (!badge.cls) return <span className="text-gray-500 text-sm">{badge.label}</span>
        return (
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${badge.cls}`}>
            {badge.label}
          </span>
        )
      }
      case 'actions':
        return (
          <div className="relative" data-row-menu>
            <button
              onClick={e => { e.stopPropagation(); setOpenRowMenu(openRowMenu === item.id ? null : item.id) }}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200"
            >
              <IconDots />
            </button>
            {openRowMenu === item.id && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30 py-1 max-h-80 overflow-y-auto">
                <Link
                  href={`/inventory/items/${item.id}`}
                  className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                >
                  View Details
                </Link>
                <button onClick={() => handleSingleAction('adjust', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Adjust</button>
                <button onClick={() => handleSingleAction('move', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Move</button>
                <button onClick={() => handleSingleAction('status', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Assign Status</button>
                <button onClick={() => handleSingleAction('assign-vendor', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Assign Vendor</button>
                <button onClick={() => handleSingleAction('change-product', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Change Product</button>
                <button onClick={() => handleSingleAction('assign-batch', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Assign Batch</button>
                <button onClick={() => handleSingleAction('sublot', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Sublot</button>
                <button onClick={() => handleSingleAction('convert', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Convert</button>
                <button onClick={() => handleSingleAction('lab-sample', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Lab Sample</button>
                <button onClick={() => handleSingleAction('print', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Print Label</button>
                <hr className="border-gray-700 my-1" />
                <button onClick={() => handleSingleAction('transactions', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">View Transactions</button>
                <button onClick={() => handleSingleAction('audit', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Audit Package</button>
                <button onClick={() => handleSingleAction('destroy', item.id)} className="block w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300">Destroy</button>
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }, [openRowMenu, handleSingleAction])

  /* --- Page buttons --- */
  const pageButtons = useMemo(() => {
    const pages: (number | string)[] = []
    const total = pagination.total_pages
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < total - 2) pages.push('...')
      pages.push(total)
    }
    return pages
  }, [page, pagination.total_pages])

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-4">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-50">Inventory</h1>
        <div className="flex items-center gap-2">
          {/* Actions dropdown */}
          <div className="relative" ref={actionsDropRef}>
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 border border-gray-600"
            >
              Actions
              <IconChevronDown />
            </button>
            {showActionsDropdown && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-1">
                <button
                  onClick={() => { exportCSV(); setShowActionsDropdown(false) }}
                  className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                >
                  Export CSV
                </button>
              </div>
            )}
          </div>
          <Link
            href="/inventory/receive-history"
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-medium border border-gray-600"
          >
            Receive History
          </Link>
          <Link
            href="/inventory/receive"
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
          >
            Receive Inventory
          </Link>
        </div>
      </div>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Items"
          value={summaryStats.totalItems.toLocaleString()}
          icon={<IconPackage />}
        />
        <SummaryCard
          label="Total Value"
          value={summaryStats.totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
          color="text-emerald-400"
          icon={<IconDollar />}
        />
        <SummaryCard
          label="Low Stock"
          value={String(summaryStats.lowStock)}
          color={summaryStats.lowStock > 0 ? 'text-amber-400' : 'text-gray-50'}
          icon={<IconAlert />}
        />
        <SummaryCard
          label="On Hold"
          value={String(summaryStats.onHold)}
          color={summaryStats.onHold > 0 ? 'text-red-400' : 'text-gray-50'}
          icon={<IconPause />}
        />
      </div>

      {/* ---- Search & Filters ---- */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <div className="absolute inset-y-0 left-3 flex items-center text-gray-500">
              <IconSearch />
            </div>
            <input
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder="Search by SKU, product, package ID, batch, strain, or barcode"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Filter dropdowns */}
          <FilterDropdown label="All Rooms" options={rooms} value={roomFilter} onChange={v => { setRoomFilter(v); setPage(1) }} />
          <FilterDropdown label="All Brands" options={brands} value={brandFilter} onChange={v => { setBrandFilter(v); setPage(1) }} />
          <FilterDropdown label="All Vendors" options={vendors} value={vendorFilter} onChange={v => { setVendorFilter(v); setPage(1) }} />
          <FilterDropdown label="All Categories" options={categories} value={categoryFilter} onChange={v => { setCategoryFilter(v); setPage(1) }} />
          <select
            value={testingFilter}
            onChange={e => { setTestingFilter(e.target.value); setPage(1) }}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="">All Testing</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="untested">Untested</option>
          </select>
          <select
            value={onHoldFilter}
            onChange={e => { setOnHoldFilter(e.target.value); setPage(1) }}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none cursor-pointer min-w-[120px]"
          >
            <option value="">Hold Status</option>
            <option value="true">On Hold</option>
            <option value="false">Not On Hold</option>
          </select>

          {/* Column config gear */}
          <div className="relative" ref={colConfigRef}>
            <button
              onClick={() => setShowColConfig(!showColConfig)}
              className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
              title="Configure columns"
            >
              <IconGear />
            </button>
            {showColConfig && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-2 px-3 max-h-80 overflow-y-auto">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Visible Columns</p>
                {ALL_COLUMNS.filter(c => c.key !== 'actions').map(col => (
                  <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colVis[col.key] !== false}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-300">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 uppercase">Active:</span>
            {activeFilters.map(f => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-800 text-xs"
              >
                {f.label}: {f.valueLabel}
                <button onClick={() => clearFilter(f.key)} className="hover:text-white">
                  <IconX />
                </button>
              </span>
            ))}
            <button
              onClick={() => {
                setRoomFilter('')
                setBrandFilter('')
                setVendorFilter('')
                setCategoryFilter('')
                setTestingFilter('')
                setOnHoldFilter('')
                setPage(1)
              }}
              className="text-xs text-gray-500 hover:text-gray-300 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ---- Bulk Actions Bar ---- */}
      {selectedIds.size > 0 && (
        <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-emerald-300 font-medium">
            {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowMoveModal(true)} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Move</button>
            <button onClick={() => setShowStatusModal(true)} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Assign Status</button>
            <button onClick={() => setShowVendorModal(true)} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Change Vendor</button>
            <button onClick={() => setShowAdjustModal(true)} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Adjust</button>
            <button onClick={() => setShowEditTagsModal(true)} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Edit Tags</button>
            <button onClick={() => setShowCombineModal(true)} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Combine</button>
            <button onClick={() => setShowPrintModal(true)} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Print Labels</button>
            <button onClick={() => setShowAuditModal(true)} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Audit</button>
            <button onClick={exportSelectedCSV} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Export Selected</button>
            <button onClick={() => setShowDestroyModal(true)} className="px-3 py-1.5 text-xs bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900/70 border border-red-800">Destroy</button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300">Clear</button>
          </div>
        </div>
      )}

      {/* ---- Table ---- */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/80">
                {/* Checkbox column */}
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500"
                  />
                </th>
                {visibleColumns.map(col => (
                  <th
                    key={col.key}
                    className={`px-3 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.sortable ? 'cursor-pointer select-none hover:text-gray-200' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && col.sortKey === sortBy && (
                        sortDir === 'asc' ? <IconChevronUp /> : <IconChevronDown />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-3 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-3 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <IconPackage />
                      <span className="text-sm">No inventory items found</span>
                      {(search || activeFilters.length > 0) && (
                        <button
                          onClick={() => {
                            setSearchInput('')
                            setSearch('')
                            setRoomFilter('')
                            setBrandFilter('')
                            setVendorFilter('')
                            setCategoryFilter('')
                            setTestingFilter('')
                            setOnHoldFilter('')
                            setPage(1)
                          }}
                          className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map(item => {
                  const isLow = item.quantity > 0 && item.quantity <= 5
                  const isSelected = selectedIds.has(item.id)
                  return (
                    <tr
                      key={item.id}
                      className={`
                        transition-colors
                        ${isLow ? 'bg-amber-900/10 hover:bg-amber-900/20' : 'hover:bg-gray-700/30'}
                        ${isSelected ? 'bg-emerald-900/15' : ''}
                      `}
                    >
                      <td className="w-10 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500"
                        />
                      </td>
                      {visibleColumns.map(col => (
                        <td
                          key={col.key}
                          className={`px-3 py-2.5 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                        >
                          {renderCell(col, item)}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ---- Pagination ---- */}
        {pagination.total > 0 && (
          <div className="border-t border-gray-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                Showing {showingFrom}-{showingTo} of {pagination.total.toLocaleString()}
              </span>
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 text-xs rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {pageButtons.map((p, idx) =>
                typeof p === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-gray-500">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 text-xs rounded border ${p === page ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                disabled={page >= pagination.total_pages}
                className="px-2 py-1 text-xs rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Bulk Modals (use selectedIds, for multi-select from bulk bar) ---- */}
      <MoveModal
        open={showMoveModal}
        onClose={() => { setShowMoveModal(false); setSingleActionItem(null) }}
        rooms={rooms}
        selectedIds={Array.from(selectedIds)}
        onSuccess={handleBulkSuccess}
      />
      <AssignStatusModal
        open={showStatusModal}
        onClose={() => { setShowStatusModal(false); setSingleActionItem(null) }}
        selectedIds={Array.from(selectedIds)}
        onSuccess={handleBulkSuccess}
      />
      <ChangeVendorModal
        open={showVendorModal}
        onClose={() => { setShowVendorModal(false); setSingleActionItem(null) }}
        vendors={vendors}
        selectedIds={Array.from(selectedIds)}
        onSuccess={handleBulkSuccess}
      />
      <AdjustModal
        open={showAdjustModal}
        onClose={() => { setShowAdjustModal(false); setSingleActionItem(null) }}
        selectedIds={Array.from(selectedIds)}
        onSuccess={handleBulkSuccess}
      />
      {showEditTagsModal && (
        <EditTagsModal
          selectedIds={Array.from(selectedIds)}
          onClose={() => setShowEditTagsModal(false)}
          onSuccess={handleBulkSuccess}
        />
      )}
      {showCombineModal && (
        <CombineModal
          sourceItems={items.filter(i => selectedIds.has(i.id)).map(i => ({
            id: i.id,
            productName: i.products?.name ?? 'Unknown',
            packageId: i.biotrack_barcode,
            quantity: i.quantity,
          }))}
          onClose={() => setShowCombineModal(false)}
          onSuccess={handleBulkSuccess}
        />
      )}

      {/* ---- Single-Item Modals (use singleActionItem from row "..." menu) ---- */}
      {showPrintModal && singleActionItem && (
        <EnhancedPrintLabelsModal
          itemIds={[singleActionItem.id]}
          productName={singleActionItem.products?.name ?? 'Unknown'}
          onClose={() => { setShowPrintModal(false); setSingleActionItem(null) }}
          onSuccess={handleBulkSuccess}
        />
      )}
      {showPrintModal && !singleActionItem && selectedIds.size > 0 && (
        <EnhancedPrintLabelsModal
          itemIds={Array.from(selectedIds)}
          onClose={() => setShowPrintModal(false)}
          onSuccess={handleBulkSuccess}
        />
      )}
      {showDestroyModal && singleActionItem && (
        <EnhancedDestroyModal
          itemId={singleActionItem.id}
          productName={singleActionItem.products?.name ?? 'Unknown'}
          packageId={singleActionItem.biotrack_barcode}
          currentQty={singleActionItem.quantity}
          onClose={() => { setShowDestroyModal(false); setSingleActionItem(null) }}
          onSuccess={handleBulkSuccess}
        />
      )}
      {showDestroyModal && !singleActionItem && (
        <DestroyModal
          open={true}
          onClose={() => setShowDestroyModal(false)}
          selectedIds={Array.from(selectedIds)}
          onSuccess={handleBulkSuccess}
        />
      )}
      {showSublotModal && singleActionItem && (
        <EnhancedSublotModal
          itemId={singleActionItem.id}
          productName={singleActionItem.products?.name ?? 'Unknown'}
          packageId={singleActionItem.biotrack_barcode}
          currentQty={singleActionItem.quantity}
          mode="sublot"
          onClose={() => { setShowSublotModal(false); setSingleActionItem(null) }}
          onSuccess={handleBulkSuccess}
        />
      )}
      {showConvertModal && singleActionItem && (
        <ConvertModal
          itemId={singleActionItem.id}
          productName={singleActionItem.products?.name ?? 'Unknown'}
          packageId={singleActionItem.biotrack_barcode}
          currentQty={singleActionItem.quantity}
          onClose={() => { setShowConvertModal(false); setSingleActionItem(null) }}
          onSuccess={handleBulkSuccess}
        />
      )}
      {showTransactionsModal && singleActionItem && (
        <TransactionsModal
          itemId={singleActionItem.id}
          onClose={() => { setShowTransactionsModal(false); setSingleActionItem(null) }}
        />
      )}
      {showAssignVendorModal && singleActionItem && (
        <AssignVendorModal
          itemId={singleActionItem.id}
          currentVendorName={singleActionItem.products?.vendors?.name ?? null}
          onClose={() => { setShowAssignVendorModal(false); setSingleActionItem(null) }}
          onSuccess={handleBulkSuccess}
        />
      )}
      {showChangeProductModal && singleActionItem && (
        <ChangeProductModal
          itemId={singleActionItem.id}
          currentProduct={singleActionItem.products ? {
            id: singleActionItem.products.id,
            name: singleActionItem.products.name,
            sku: singleActionItem.products.sku,
            brand: singleActionItem.products.brands?.name ?? null,
            category: singleActionItem.products.product_categories?.name ?? null,
          } : null}
          onClose={() => { setShowChangeProductModal(false); setSingleActionItem(null) }}
          onSuccess={handleBulkSuccess}
        />
      )}
      {showAssignBatchModal && singleActionItem && (
        <AssignBatchModal
          itemId={singleActionItem.id}
          currentBatch={singleActionItem.batch_id}
          onClose={() => { setShowAssignBatchModal(false); setSingleActionItem(null) }}
          onSuccess={handleBulkSuccess}
        />
      )}
      {showLabSampleModal && singleActionItem && (
        <LabSampleModal
          itemId={singleActionItem.id}
          productName={singleActionItem.products?.name ?? 'Unknown'}
          packageId={singleActionItem.biotrack_barcode}
          currentQty={singleActionItem.quantity}
          onClose={() => { setShowLabSampleModal(false); setSingleActionItem(null) }}
          onSuccess={handleBulkSuccess}
        />
      )}
      {showAuditModal && (
        <AuditPackagesModal
          itemIds={singleActionItem ? [singleActionItem.id] : Array.from(selectedIds)}
          onClose={() => { setShowAuditModal(false); setSingleActionItem(null) }}
          onSuccess={handleBulkSuccess}
        />
      )}
    </div>
  )
}
