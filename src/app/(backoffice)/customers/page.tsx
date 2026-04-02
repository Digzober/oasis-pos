'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LookupOption { id: string; name: string }

interface Customer {
  id: string
  first_name: string | null
  last_name: string | null
  middle_name: string | null
  phone: string | null
  email: string | null
  customer_type: string
  is_medical: boolean
  status: string
  city: string | null
  state: string | null
  zip: string | null
  medical_card_number: string | null
  medical_card_expiration: string | null
  id_expiration: string | null
  lifetime_spend: number
  visit_count: number
  last_visit_at: string | null
  created_at: string
  notes: string | null
  opted_into_marketing: boolean
  opted_into_sms: boolean
  is_active: boolean
  loyalty_balances: Array<{
    current_points: number
    tier_id: string | null
    loyalty_tiers: { id: string; name: string } | null
  }> | null
}

interface PaginationInfo { page: number; per_page: number; total: number; total_pages: number }
type SortDir = 'asc' | 'desc'

interface ColumnDef {
  key: string; label: string; sortKey?: string; sortable: boolean; defaultVisible: boolean; align: 'left' | 'right' | 'center'
}

/* ------------------------------------------------------------------ */
/*  Columns                                                            */
/* ------------------------------------------------------------------ */

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'full_name', label: 'Full Name', sortKey: 'last_name', sortable: true, defaultVisible: true, align: 'left' },
  { key: 'first_name', label: 'First Name', sortKey: 'first_name', sortable: true, defaultVisible: false, align: 'left' },
  { key: 'last_name', label: 'Last Name', sortKey: 'last_name', sortable: true, defaultVisible: false, align: 'left' },
  { key: 'phone', label: 'Phone', sortable: false, defaultVisible: true, align: 'left' },
  { key: 'email', label: 'Email', sortable: false, defaultVisible: true, align: 'left' },
  { key: 'type', label: 'Type', sortKey: 'customer_type', sortable: true, defaultVisible: true, align: 'center' },
  { key: 'status', label: 'Status', sortKey: 'status', sortable: true, defaultVisible: true, align: 'center' },
  { key: 'city', label: 'City', sortKey: 'city', sortable: true, defaultVisible: false, align: 'left' },
  { key: 'state', label: 'State', sortable: false, defaultVisible: false, align: 'left' },
  { key: 'zip', label: 'Zip', sortable: false, defaultVisible: false, align: 'left' },
  { key: 'mj_state_id', label: 'MJ State ID', sortable: false, defaultVisible: false, align: 'left' },
  { key: 'id_expiration', label: 'ID Expiration', sortKey: 'id_expiration', sortable: true, defaultVisible: false, align: 'left' },
  { key: 'med_card_exp', label: 'Med Card Exp', sortKey: 'medical_card_expiration', sortable: true, defaultVisible: true, align: 'left' },
  { key: 'loyalty_points', label: 'Loyalty Points', sortable: false, defaultVisible: true, align: 'right' },
  { key: 'loyalty_tier', label: 'Loyalty Tier', sortable: false, defaultVisible: false, align: 'left' },
  { key: 'lifetime_spend', label: 'Lifetime Spend', sortKey: 'lifetime_spend', sortable: true, defaultVisible: true, align: 'right' },
  { key: 'visit_count', label: 'Visit Count', sortKey: 'visit_count', sortable: true, defaultVisible: false, align: 'right' },
  { key: 'last_visit', label: 'Last Visit', sortKey: 'last_visit_at', sortable: true, defaultVisible: true, align: 'left' },
  { key: 'groups', label: 'Groups', sortable: false, defaultVisible: false, align: 'left' },
  { key: 'opted_email', label: 'Opted Email', sortable: false, defaultVisible: false, align: 'center' },
  { key: 'opted_sms', label: 'Opted SMS', sortable: false, defaultVisible: false, align: 'center' },
  { key: 'notes', label: 'Notes', sortable: false, defaultVisible: false, align: 'left' },
  { key: 'created', label: 'Created', sortKey: 'created_at', sortable: true, defaultVisible: false, align: 'left' },
  { key: 'actions', label: '', sortable: false, defaultVisible: true, align: 'right' },
]

const STORAGE_KEY = 'customer-columns-config'

function loadColVis(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) } catch { /* */ }
  return {}
}
function saveColVis(v: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) } catch { /* */ }
}
function initColVis(): Record<string, boolean> {
  const saved = loadColVis()
  const r: Record<string, boolean> = {}
  for (const c of ALL_COLUMNS) r[c.key] = saved[c.key] !== undefined ? Boolean(saved[c.key]) : c.defaultVisible
  return r
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }
function fmtDate(d: string | null) { if (!d) return '\u2014'; return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
function relDate(d: string | null) {
  if (!d) return 'Never'
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

function typeBadge(t: string): { label: string; cls: string } {
  switch (t) {
    case 'medical': return { label: 'MED', cls: 'bg-blue-900/50 text-blue-300 border-blue-700' }
    case 'medical_out_of_state': return { label: 'MED-OOS', cls: 'bg-blue-900/50 text-blue-300 border-blue-700' }
    case 'medical_tax_exempt': return { label: 'MED-TE', cls: 'bg-purple-900/50 text-purple-300 border-purple-700' }
    case 'recreational': return { label: 'REC', cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' }
    default: return { label: t.toUpperCase().slice(0, 4), cls: 'bg-gray-700/50 text-gray-300 border-gray-600' }
  }
}

function statusBadge(s: string): { label: string; cls: string } {
  switch (s) {
    case 'active': return { label: 'Active', cls: 'bg-emerald-900/50 text-emerald-400 border-emerald-700' }
    case 'banned': return { label: 'Banned', cls: 'bg-red-900/50 text-red-400 border-red-700' }
    case 'inactive': return { label: 'Inactive', cls: 'bg-gray-700/50 text-gray-400 border-gray-600' }
    default: return { label: s, cls: 'bg-gray-700/50 text-gray-300 border-gray-600' }
  }
}

function isExpiringSoon(d: string | null): 'expired' | 'warning' | 'ok' {
  if (!d) return 'ok'
  const diff = new Date(d).getTime() - Date.now()
  if (diff < 0) return 'expired'
  if (diff < 30 * 86400000) return 'warning'
  return 'ok'
}

function csvEscape(v: string) { return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v }

function getLoyalty(c: Customer): { points: number; tier: string | null } {
  const bal = Array.isArray(c.loyalty_balances) && c.loyalty_balances.length > 0 ? c.loyalty_balances[0] : null
  return { points: bal?.current_points ?? 0, tier: bal?.loyalty_tiers?.name ?? null }
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

function IconSearch() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg> }
function IconGear() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
function IconChevronDown() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg> }
function IconChevronUp() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg> }
function IconDots() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg> }
function IconX() { return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> }
function IconUsers() { return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> }
function IconWarning() { return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> }

/* ------------------------------------------------------------------ */
/*  Summary Card                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({ label, value, color, icon }: { label: string; value: string; color?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-gray-700/50 text-gray-400 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 tabular-nums ${color ?? 'text-gray-50'}`}>{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add Customer Modal (simple version)                                */
/* ------------------------------------------------------------------ */

function AddCustomerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [customerType, setCustomerType] = useState('recreational')
  const [medCard, setMedCard] = useState('')
  const [medCardExp, setMedCardExp] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !dob) { setError('First name, last name, and DOB are required'); return }
    setSaving(true); setError(null)
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: firstName.trim(), last_name: lastName.trim(), date_of_birth: dob,
        phone: phone || null, email: email || null, customer_type: customerType,
        medical_card_number: medCard || null, medical_card_expiration: medCardExp || null,
      }),
    })
    if (res.ok) { onSuccess(); onClose() }
    else { const d = await res.json().catch(() => null); setError(d?.error ?? 'Failed to create customer') }
    setSaving(false)
  }

  const iCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const lCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'
  const isMed = customerType.startsWith('medical')

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-50">Add Customer</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><IconX /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lCls}>First Name *</label><input value={firstName} onChange={e => setFirstName(e.target.value)} className={iCls} /></div>
              <div><label className={lCls}>Last Name *</label><input value={lastName} onChange={e => setLastName(e.target.value)} className={iCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lCls}>Date of Birth *</label><input type="date" value={dob} onChange={e => setDob(e.target.value)} className={iCls} /></div>
              <div>
                <label className={lCls}>Type</label>
                <select value={customerType} onChange={e => setCustomerType(e.target.value)} className={iCls}>
                  <option value="recreational">Recreational</option>
                  <option value="medical">Medical</option>
                  <option value="medical_out_of_state">Medical (Out of State)</option>
                  <option value="medical_tax_exempt">Medical (Tax Exempt)</option>
                  <option value="non_cannabis">Non-Cannabis</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={lCls}>Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} className={iCls} placeholder="(505) 555-1234" /></div>
              <div><label className={lCls}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={iCls} /></div>
            </div>
            {isMed && (
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lCls}>Medical Card #</label><input value={medCard} onChange={e => setMedCard(e.target.value)} className={iCls} /></div>
                <div><label className={lCls}>Med Card Expiration</label><input type="date" value={medCardExp} onChange={e => setMedCardExp(e.target.value)} className={iCls} /></div>
              </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-700">
            <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function CustomersPage() {
  /* Data */
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, per_page: 50, total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(true)

  /* Filters */
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  /* Sort & Pagination */
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)

  /* Selection */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  /* Column Config */
  const [colVis, setColVis] = useState<Record<string, boolean>>(initColVis)
  const [showColConfig, setShowColConfig] = useState(false)

  /* Lookups */
  const [groups, setGroups] = useState<LookupOption[]>([])

  /* Modals */
  const [showAddModal, setShowAddModal] = useState(false)
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [showBulkDropdown, setShowBulkDropdown] = useState(false)
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null)

  /* Refs */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colConfigRef = useRef<HTMLDivElement>(null)
  const actionsDropRef = useRef<HTMLDivElement>(null)

  const visibleColumns = useMemo(() => ALL_COLUMNS.filter(c => colVis[c.key] !== false), [colVis])

  /* Fetch groups */
  useEffect(() => {
    fetch('/api/customer-groups', { cache: 'no-store' }).then(r => r.ok ? r.json() : { groups: [] }).then(d => {
      setGroups((d.groups ?? []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name })))
    }).catch(() => {})
  }, [])

  /* Fetch customers */
  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('per_page', String(perPage))
    params.set('sort_by', sortBy)
    params.set('sort_dir', sortDir)
    if (search) params.set('q', search)
    if (typeFilter) params.set('type', typeFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (groupFilter) params.set('group_id', groupFilter)
    if (showArchived) params.set('include_archived', 'true')
    try {
      const res = await fetch(`/api/customers?${params.toString()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers ?? [])
        setPagination(data.pagination ?? { page: 1, per_page: perPage, total: 0, total_pages: 0 })
      }
    } catch { /* */ }
    setLoading(false)
  }, [page, perPage, search, sortBy, sortDir, typeFilter, statusFilter, groupFilter, showArchived])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  /* Debounced search */
  const handleSearchInput = useCallback((v: string) => {
    setSearchInput(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setSearch(v); setPage(1) }, 300)
  }, [])

  /* Sort */
  const handleSort = useCallback((key: string) => {
    const col = ALL_COLUMNS.find(c => c.key === key)
    if (!col?.sortable || !col.sortKey) return
    if (sortBy === col.sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col.sortKey); setSortDir('asc') }
    setPage(1)
  }, [sortBy])

  /* Selection */
  const allSelected = customers.length > 0 && customers.every(c => selectedIds.has(c.id))
  const toggleAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(customers.map(c => c.id)))
  }, [customers, allSelected])
  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  /* Column toggle */
  const toggleCol = useCallback((key: string) => {
    setColVis(prev => { const n = { ...prev, [key]: !prev[key] }; saveColVis(n); return n })
  }, [])

  /* Export CSV */
  const exportCSV = useCallback((subset?: Customer[]) => {
    const data = subset ?? customers
    const headers = ['First Name', 'Last Name', 'Phone', 'Email', 'Type', 'Status', 'Lifetime Spend', 'Visits', 'Last Visit']
    const rows = data.map(c => [
      csvEscape(c.first_name ?? ''), csvEscape(c.last_name ?? ''), csvEscape(c.phone ?? ''),
      csvEscape(c.email ?? ''), c.customer_type, c.status, String(c.lifetime_spend),
      String(c.visit_count), c.last_visit_at ?? '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [customers])

  /* Bulk action */
  const handleBulkAction = useCallback(async (action: string, extra?: Record<string, unknown>) => {
    const res = await fetch('/api/customers/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, customer_ids: Array.from(selectedIds), ...extra }),
    })
    if (res.ok) { setSelectedIds(new Set()); fetchCustomers() }
  }, [selectedIds, fetchCustomers])

  /* Outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (colConfigRef.current && !colConfigRef.current.contains(t)) setShowColConfig(false)
      if (actionsDropRef.current && !actionsDropRef.current.contains(t)) setShowActionsDropdown(false)
      if (!t.closest('[data-row-menu]')) setOpenRowMenu(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  /* Summary stats */
  const stats = useMemo(() => {
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 86400000
    return {
      total: pagination.total,
      active: customers.filter(c => c.status === 'active').length,
      medical: customers.filter(c => c.customer_type.startsWith('medical')).length,
      banned: customers.filter(c => c.status === 'banned').length,
      newThisMonth: customers.filter(c => new Date(c.created_at).getTime() > thirtyDaysAgo).length,
    }
  }, [customers, pagination.total])

  /* Pagination buttons */
  const pageButtons = useMemo(() => {
    const pages: (number | string)[] = []
    const total = pagination.total_pages
    if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i) }
    else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i)
      if (page < total - 2) pages.push('...')
      pages.push(total)
    }
    return pages
  }, [page, pagination.total_pages])

  const showingFrom = pagination.total === 0 ? 0 : (page - 1) * perPage + 1
  const showingTo = Math.min(page * perPage, pagination.total)

  /* Render cell */
  const renderCell = useCallback((col: ColumnDef, c: Customer) => {
    const loyalty = getLoyalty(c)
    switch (col.key) {
      case 'full_name': return <Link href={`/customers/${c.id}`} className="text-gray-50 hover:text-emerald-400">{[c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ') || '\u2014'}</Link>
      case 'first_name': return <span className="text-gray-200 text-sm">{c.first_name ?? '\u2014'}</span>
      case 'last_name': return <span className="text-gray-200 text-sm">{c.last_name ?? '\u2014'}</span>
      case 'phone': return <span className="text-gray-300 text-sm">{c.phone ?? '\u2014'}</span>
      case 'email': return <span className="text-gray-400 text-xs">{c.email ?? '\u2014'}</span>
      case 'type': { const b = typeBadge(c.customer_type); return <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${b.cls}`}>{b.label}</span> }
      case 'status': { const b = statusBadge(c.status); return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${b.cls}`}>{b.label}</span> }
      case 'city': return <span className="text-gray-300 text-sm">{c.city ?? '\u2014'}</span>
      case 'state': return <span className="text-gray-300 text-sm">{c.state ?? '\u2014'}</span>
      case 'zip': return <span className="text-gray-300 text-sm">{c.zip ?? '\u2014'}</span>
      case 'mj_state_id': return <span className="text-gray-400 text-xs font-mono">{c.medical_card_number ?? '\u2014'}</span>
      case 'id_expiration': {
        const exp = isExpiringSoon(c.id_expiration)
        return <span className={`text-sm flex items-center gap-1 ${exp === 'expired' ? 'text-red-400' : exp === 'warning' ? 'text-amber-400' : 'text-gray-300'}`}>{fmtDate(c.id_expiration)}{exp !== 'ok' && <IconWarning />}</span>
      }
      case 'med_card_exp': {
        const exp = isExpiringSoon(c.medical_card_expiration)
        return <span className={`text-sm flex items-center gap-1 ${exp === 'expired' ? 'text-red-400' : exp === 'warning' ? 'text-amber-400' : 'text-gray-300'}`}>{fmtDate(c.medical_card_expiration)}{exp !== 'ok' && <IconWarning />}</span>
      }
      case 'loyalty_points': return <span className="text-gray-200 text-sm tabular-nums">{loyalty.points.toLocaleString()}</span>
      case 'loyalty_tier': return loyalty.tier ? <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{loyalty.tier}</span> : <span className="text-gray-500">\u2014</span>
      case 'lifetime_spend': return <span className="text-gray-200 text-sm tabular-nums">{fmt(c.lifetime_spend)}</span>
      case 'visit_count': return <span className="text-gray-200 text-sm tabular-nums">{c.visit_count}</span>
      case 'last_visit': return <span className="text-gray-300 text-sm">{relDate(c.last_visit_at)}</span>
      case 'groups': return <span className="text-gray-500 text-xs">\u2014</span>
      case 'opted_email': return c.opted_into_marketing ? <span className="text-emerald-400 text-xs">Yes</span> : <span className="text-gray-500 text-xs">No</span>
      case 'opted_sms': return c.opted_into_sms ? <span className="text-emerald-400 text-xs">Yes</span> : <span className="text-gray-500 text-xs">No</span>
      case 'notes': return <span className="text-gray-400 text-xs truncate max-w-[150px] block">{c.notes ? c.notes.slice(0, 50) : '\u2014'}</span>
      case 'created': return <span className="text-gray-300 text-sm">{fmtDate(c.created_at)}</span>
      case 'actions': return (
        <div className="relative" data-row-menu>
          <button onClick={e => { e.stopPropagation(); setOpenRowMenu(openRowMenu === c.id ? null : c.id) }} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200"><IconDots /></button>
          {openRowMenu === c.id && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30 py-1">
              <Link href={`/customers/${c.id}`} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">View Profile</Link>
              <Link href={`/customers/${c.id}`} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100">Edit</Link>
              <hr className="border-gray-700 my-1" />
              {c.status === 'banned' ? (
                <button onClick={() => { setOpenRowMenu(null); handleBulkAction('change_status', { status: 'active' }).then(() => { setSelectedIds(new Set([c.id])); fetchCustomers() }) }} className="block w-full text-left px-3 py-1.5 text-sm text-emerald-400 hover:bg-gray-700">Unban</button>
              ) : (
                <button onClick={() => { setOpenRowMenu(null); handleBulkAction('change_status', { status: 'banned', reason: 'Banned from list page' }).then(() => { setSelectedIds(new Set([c.id])); fetchCustomers() }) }} className="block w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700">Ban</button>
              )}
              <button onClick={() => { setOpenRowMenu(null); handleBulkAction('archive').then(() => { setSelectedIds(new Set([c.id])); fetchCustomers() }) }} className="block w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700">Archive</button>
            </div>
          )}
        </div>
      )
      default: return null
    }
  }, [openRowMenu, handleBulkAction, fetchCustomers])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-50">Customers</h1>
        <div className="flex items-center gap-2">
          <Link href="/customers/segments" className="text-sm px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Segments</Link>
          <Link href="/customers/groups" className="text-sm px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Groups</Link>
          <div className="relative" ref={actionsDropRef}>
            <button onClick={() => setShowActionsDropdown(!showActionsDropdown)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 border border-gray-600">Actions <IconChevronDown /></button>
            {showActionsDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-1">
                <button onClick={() => { exportCSV(); setShowActionsDropdown(false) }} className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700">Export CSV</button>
              </div>
            )}
          </div>
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">+ Add Customer</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard label="Total Customers" value={stats.total.toLocaleString()} icon={<IconUsers />} />
        <SummaryCard label="Active" value={String(stats.active)} color="text-emerald-400" icon={<IconUsers />} />
        <SummaryCard label="Medical" value={String(stats.medical)} color="text-blue-400" icon={<IconUsers />} />
        <SummaryCard label="Banned" value={String(stats.banned)} color={stats.banned > 0 ? 'text-red-400' : 'text-gray-50'} icon={<IconUsers />} />
        <SummaryCard label="New (30 days)" value={String(stats.newThisMonth)} icon={<IconUsers />} />
      </div>

      {/* Search & Filters */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <div className="absolute inset-y-0 left-3 flex items-center text-gray-500"><IconSearch /></div>
            <input value={searchInput} onChange={e => handleSearchInput(e.target.value)} placeholder="Search by name, phone, email, medical card, or ID" className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }} className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 min-w-[140px]">
            <option value="">All Types</option>
            <option value="recreational">Recreational</option>
            <option value="medical">Medical</option>
            <option value="medical_out_of_state">Med (Out of State)</option>
            <option value="medical_tax_exempt">Med (Tax Exempt)</option>
            <option value="non_cannabis">Non-Cannabis</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 min-w-[120px]">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
            <option value="inactive">Inactive</option>
          </select>
          {groups.length > 0 && (
            <select value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setPage(1) }} className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 min-w-[140px]">
              <option value="">All Groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input type="checkbox" checked={showArchived} onChange={e => { setShowArchived(e.target.checked); setPage(1) }} className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500" />
            Show archived
          </label>
          <div className="relative" ref={colConfigRef}>
            <button onClick={() => setShowColConfig(!showColConfig)} className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700" title="Configure columns"><IconGear /></button>
            {showColConfig && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-2 px-3 max-h-80 overflow-y-auto">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Visible Columns</p>
                {ALL_COLUMNS.filter(c => c.key !== 'actions').map(col => (
                  <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input type="checkbox" checked={colVis[col.key] !== false} onChange={() => toggleCol(col.key)} className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500" />
                    <span className="text-sm text-gray-300">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-emerald-300 font-medium">{selectedIds.size} customer{selectedIds.size > 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={() => handleBulkAction('change_status', { status: 'active' })} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Set Active</button>
            <button onClick={() => handleBulkAction('change_status', { status: 'banned', reason: 'Bulk ban' })} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Ban</button>
            <button onClick={() => exportCSV(customers.filter(c => selectedIds.has(c.id)))} className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600">Export Selected</button>
            <button onClick={() => handleBulkAction('archive')} className="px-3 py-1.5 text-xs bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900/70 border border-red-800">Archive</button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300">Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/80">
                <th className="w-10 px-3 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500" /></th>
                {visibleColumns.map(col => (
                  <th key={col.key} className={`px-3 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.sortable ? 'cursor-pointer select-none hover:text-gray-200' : ''}`} onClick={() => col.sortable && handleSort(col.key)}>
                    <span className="inline-flex items-center gap-1">{col.label}{col.sortable && col.sortKey === sortBy && (sortDir === 'asc' ? <IconChevronUp /> : <IconChevronDown />)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading && customers.length === 0 ? (
                <tr><td colSpan={visibleColumns.length + 1} className="px-3 py-16 text-center text-gray-500"><div className="flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm">Loading customers...</span></div></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={visibleColumns.length + 1} className="px-3 py-16 text-center text-gray-500"><div className="flex flex-col items-center gap-2"><IconUsers /><span className="text-sm">No customers found</span></div></td></tr>
              ) : customers.map(c => (
                <tr key={c.id} className={`transition-colors hover:bg-gray-700/30 ${c.status === 'banned' ? 'bg-red-900/10' : ''} ${selectedIds.has(c.id) ? 'bg-emerald-900/15' : ''}`}>
                  <td className="w-10 px-3 py-2.5"><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleOne(c.id)} className="rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500" /></td>
                  {visibleColumns.map(col => (
                    <td key={col.key} className={`px-3 py-2.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>{renderCell(col, c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="border-t border-gray-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Showing {showingFrom}-{showingTo} of {pagination.total.toLocaleString()}</span>
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }} className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1">
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 py-1 text-xs rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-30">Prev</button>
              {pageButtons.map((p, idx) => typeof p === 'string' ? (
                <span key={`e-${idx}`} className="px-2 py-1 text-xs text-gray-500">...</span>
              ) : (
                <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-xs rounded border ${p === page ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))} disabled={page >= pagination.total_pages} className="px-2 py-1 text-xs rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && <AddCustomerModal onClose={() => setShowAddModal(false)} onSuccess={fetchCustomers} />}
    </div>
  )
}
