'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useCustomerFieldVisibility } from '@/hooks/useCustomerFieldVisibility'
import {
  getCustomerFieldState,
  validateRequiredCustomerFields,
} from '@/lib/customers/fieldVisibility'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CaregiverInfo {
  first_name?: string; last_name?: string; state_id?: string; id_start_date?: string
  id_expiration?: string; address1?: string; address2?: string; city?: string
  state?: string; zip?: string; phone?: string; email?: string; dob?: string; notes?: string
}

interface CustomerGroup { id: string; name: string }

interface Customer {
  id: string; first_name: string | null; last_name: string | null; middle_name: string | null
  prefix: string | null; suffix: string | null; email: string | null; phone: string | null
  date_of_birth: string | null; address_line1: string | null; address_line2: string | null
  city: string | null; state: string | null; zip: string | null; id_type: string | null
  id_expiration: string | null; id_state: string | null; id_start_date: string | null
  is_medical: boolean; medical_card_number: string | null; medical_card_expiration: string | null
  medical_provider: string | null; status: string; ban_reason: string | null
  lifetime_spend: number; visit_count: number; last_visit_at: string | null
  opted_into_marketing: boolean; opted_into_sms: boolean; notes: string | null
  customer_type: string; gender: string | null; pronoun: string | null
  drivers_license: string | null; drivers_license_expiration: string | null
  mobile_phone: string | null; caregiver_info: CaregiverInfo | null
  created_at: string; groups: CustomerGroup[]; loyalty_points: number; loyalty_tier: string | null
}

interface LoyaltyTx { id: string; created_at: string; points_change: number; balance_after: number; reason: string | null }
interface PurchaseLine { id: string; created_at: string; product_name: string; sku: string | null; quantity: number; unit_price: number; total: number }
interface Transaction { id: string; created_at: string; transaction_type: string; line_count: number; total: number; status: string; payment_method: string | null }

/* ------------------------------------------------------------------ */
/*  Style constants                                                    */
/* ------------------------------------------------------------------ */

const inputCls = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50'
const labelCls = 'block text-xs font-medium text-secondary uppercase mb-1'
const sectionCls = 'bg-surface rounded-xl border border-edge p-6'
const tabCls = (active: boolean) => `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${active ? 'text-accent border-accent' : 'text-secondary border-transparent hover:text-primary'}`
const btnPrimary = 'px-4 h-10 bg-accent hover:bg-accent text-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50'
const btnSecondary = 'px-4 h-10 bg-raised hover:bg-raised text-primary text-sm font-medium rounded-lg transition-colors'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmtMoney = (n: number) => `$${n.toFixed(2)}`
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '--'
const relativeDate = (d: string | null) => {
  if (!d) return 'Never'
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
const fullName = (c: Customer) => [c.prefix, c.first_name, c.middle_name, c.last_name, c.suffix].filter(Boolean).join(' ')

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const STATUS_OPTIONS: Array<'active' | 'banned' | 'inactive'> = ['active', 'banned', 'inactive']
const CUSTOMER_TYPE_OPTIONS = ['recreational', 'medical']

/* ------------------------------------------------------------------ */
/*  Badges Section                                                     */
/* ------------------------------------------------------------------ */

interface Badge { id: string; name: string; color: string; icon: string | null }

function BadgesSection({ customerId }: { customerId: string }) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const loaded = useRef(false)
  const sectionCls = 'bg-surface rounded-xl border border-edge p-6'
  const inputCls = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'
  const labelCls = 'block text-xs font-medium text-secondary uppercase mb-1'

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    fetch(`/api/customers/${customerId}/badges`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { badges: [] })
      .then(d => setBadges(d.badges ?? []))
    fetch('/api/badges', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { badges: [] })
      .then(d => setAllBadges(d.badges ?? []))
  }, [customerId])

  async function addBadge(badgeId: string) {
    await fetch(`/api/customers/${customerId}/badges`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ add_badge_ids: [badgeId] }),
    })
    const res = await fetch(`/api/customers/${customerId}/badges`, { cache: 'no-store' })
    if (res.ok) { const d = await res.json(); setBadges(d.badges ?? []) }
  }

  async function removeBadge(badgeId: string) {
    await fetch(`/api/customers/${customerId}/badges`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remove_badge_ids: [badgeId] }),
    })
    setBadges(prev => prev.filter(b => b.id !== badgeId))
  }

  const available = allBadges.filter(b => !badges.some(cb => cb.id === b.id))

  return (
    <div className={sectionCls}>
      <h3 className="text-lg font-semibold mb-4">Badges</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {badges.map(b => (
          <span key={b.id} className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border border-edge-strong" style={{ backgroundColor: `${b.color}20`, color: b.color, borderColor: `${b.color}50` }}>
            {b.icon && <span>{b.icon}</span>}
            {b.name}
            <button onClick={() => removeBadge(b.id)} className="ml-1 opacity-60 hover:opacity-100">&times;</button>
          </span>
        ))}
        {badges.length === 0 && <span className="text-muted text-sm">No badges assigned</span>}
      </div>
      {available.length > 0 && (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className={labelCls}>Add Badge</label>
            <select className={inputCls} defaultValue="" onChange={e => { if (e.target.value) { addBadge(e.target.value); e.target.value = '' } }}>
              <option value="">Select a badge...</option>
              {available.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const isMedical = (customer?.customer_type ?? 'recreational').startsWith('medical')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState(0)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const visibility = useCustomerFieldVisibility()

  // Form state mirrors customer for editable tabs
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [caregiverForm, setCaregiverForm] = useState<CaregiverInfo>({})

  // Lazy-loaded tab data
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTx[] | null>(null)
  const [purchases, setPurchases] = useState<PurchaseLine[] | null>(null)
  const [purchasePage, setPurchasePage] = useState(1)
  const [purchaseTotal, setPurchaseTotal] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)
  const [txPage, setTxPage] = useState(1)
  const [txTotal, setTxTotal] = useState(0)
  const [availableGroups, setAvailableGroups] = useState<CustomerGroup[]>([])
  const [adjustPts, setAdjustPts] = useState({ points: '', reason: '' })

  /* -- Fetch customer ------------------------------------------------ */
  const fetchCustomer = useCallback(async () => {
    const res = await fetch(`/api/customers/${id}`, { cache: 'no-store' })
    if (!res.ok) { router.push('/customers'); return }
    const { customer: c } = await res.json()
    setCustomer(c)
    setForm({
      customer_type: c.customer_type, prefix: c.prefix ?? '', first_name: c.first_name ?? '',
      middle_name: c.middle_name ?? '', last_name: c.last_name ?? '', suffix: c.suffix ?? '',
      gender: c.gender ?? '', pronoun: c.pronoun ?? '', date_of_birth: c.date_of_birth ?? '',
      status: c.status, notes: c.notes ?? '',
      medical_card_number: c.medical_card_number ?? '', id_start_date: c.id_start_date ?? '',
      id_expiration: c.id_expiration ?? '', address_line1: c.address_line1 ?? '',
      address_line2: c.address_line2 ?? '', city: c.city ?? '', state: c.state ?? 'NM',
      zip: c.zip ?? '', drivers_license: c.drivers_license ?? '',
      drivers_license_expiration: c.drivers_license_expiration ?? '', phone: c.phone ?? '',
      mobile_phone: c.mobile_phone ?? '', email: c.email ?? '',
    })
    setCaregiverForm(c.caregiver_info ?? {})
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchCustomer() }, [fetchCustomer])

  /* -- Save helpers -------------------------------------------------- */
  const patchCustomer = async (body: Record<string, unknown>) => {
    setSaving(true)
    setFormError('')
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), cache: 'no-store',
      })
      if (res.ok) await fetchCustomer()
    } finally { setSaving(false) }
  }

  const saveDetails = () => {
    const missing = validateRequiredCustomerFields(visibility, 'backend', {
      type: String(form.customer_type ?? ''), name: String(form.first_name ?? ''),
      middle_name: String(form.middle_name ?? ''), last_name: String(form.last_name ?? ''),
      prefix: String(form.prefix ?? ''), suffix: String(form.suffix ?? ''),
      gender: String(form.gender ?? ''), dob: String(form.date_of_birth ?? ''),
      status: String(form.status ?? ''), notes: String(form.notes ?? ''),
    })
    if (missing.length > 0) { setFormError(`Required fields are missing: ${missing.join(', ')}`); return }
    void patchCustomer({
      customer_type: form.customer_type, prefix: form.prefix || null, first_name: form.first_name || null,
      middle_name: form.middle_name || null, last_name: form.last_name || null, suffix: form.suffix || null,
      gender: form.gender || null, pronoun: form.pronoun || null, date_of_birth: form.date_of_birth || null,
      status: form.status, notes: form.notes || null,
    })
  }

  const saveIdAddress = () => {
    const missing = validateRequiredCustomerFields(visibility, 'backend', {
      mmj_id: String(form.medical_card_number ?? ''), id_expiration: String(form.id_expiration ?? ''),
      address1: String(form.address_line1 ?? ''), address2: String(form.address_line2 ?? ''),
      city: String(form.city ?? ''), state: String(form.state ?? ''), zip: String(form.zip ?? ''),
      drivers_license: String(form.drivers_license ?? ''),
      drivers_license_exp: String(form.drivers_license_expiration ?? ''),
      phone: String(form.phone ?? ''), mobile_phone: String(form.mobile_phone ?? ''),
      email: String(form.email ?? ''),
    })
    if (missing.length > 0) { setFormError(`Required fields are missing: ${missing.join(', ')}`); return }
    void patchCustomer({
      medical_card_number: form.medical_card_number || null, id_start_date: form.id_start_date || null,
      id_expiration: form.id_expiration || null, address_line1: form.address_line1 || null,
      address_line2: form.address_line2 || null, city: form.city || null, state: form.state || null,
      zip: form.zip || null, drivers_license: form.drivers_license || null,
      drivers_license_expiration: form.drivers_license_expiration || null,
      phone: form.phone || null, mobile_phone: form.mobile_phone || null, email: form.email || null,
    })
  }

  const saveCaregiver = () => {
    const missing = validateRequiredCustomerFields(visibility, 'backend', {
      caregiver_first: caregiverForm.first_name ?? '',
      caregiver_last: caregiverForm.last_name ?? '',
      caregiver_phone: caregiverForm.phone ?? '',
      caregiver_email: caregiverForm.email ?? '',
    })
    if (missing.length > 0) { setFormError(`Required fields are missing: ${missing.join(', ')}`); return }
    void patchCustomer({ caregiver_info: caregiverForm })
  }

  /* -- Lazy fetchers ------------------------------------------------- */
  const fetchLoyaltyHistory = useCallback(async () => {
    if (loyaltyHistory) return
    const res = await fetch(`/api/customers/${id}/loyalty/history`, { cache: 'no-store' })
    if (res.ok) { const d = await res.json(); setLoyaltyHistory(d.entries ?? []) }
  }, [id, loyaltyHistory])

  const fetchPurchases = useCallback(async (page: number) => {
    const res = await fetch(`/api/customers/${id}/purchase-history?page=${page}&per_page=20`, { cache: 'no-store' })
    if (res.ok) { const d = await res.json(); setPurchases(d.lines ?? []); setPurchaseTotal(d.pagination?.total ?? 0); setPurchasePage(page) }
  }, [id])

  const fetchTransactions = useCallback(async (page: number) => {
    const res = await fetch(`/api/customers/${id}/transaction-history?page=${page}&per_page=20`, { cache: 'no-store' })
    if (res.ok) { const d = await res.json(); setTransactions(d.transactions ?? []); setTxTotal(d.pagination?.total ?? 0); setTxPage(page) }
  }, [id])

  const fetchGroups = useCallback(async () => {
    if (availableGroups.length) return
    const res = await fetch('/api/customer-groups', { cache: 'no-store' })
    if (res.ok) { const d = await res.json(); setAvailableGroups(d.groups ?? []) }
  }, [availableGroups.length])

  useEffect(() => {
    const tid = !isMedical && tab >= 2 ? tab + 1 : tab
    if (tid === 3) { fetchLoyaltyHistory(); fetchGroups() }
    if (tid === 4) fetchPurchases(1)
    if (tid === 5) fetchTransactions(1)
  }, [tab, isMedical, fetchLoyaltyHistory, fetchPurchases, fetchTransactions, fetchGroups])

  /* -- Actions ------------------------------------------------------- */
  const banCustomer = () => patchCustomer({ status: 'banned' })
  const unbanCustomer = () => patchCustomer({ status: 'active' })
  const archiveCustomer = () => patchCustomer({ status: 'inactive' })

  const adjustPoints = async () => {
    const pts = parseInt(adjustPts.points, 10)
    if (isNaN(pts) || pts === 0) return
    setSaving(true)
    try {
      await fetch(`/api/customers/${id}/loyalty/adjust`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: pts, reason: adjustPts.reason || 'Manual adjustment' }), cache: 'no-store',
      })
      setAdjustPts({ points: '', reason: '' })
      setLoyaltyHistory(null)
      fetchLoyaltyHistory()
      await fetchCustomer()
    } finally { setSaving(false) }
  }

  const removeGroup = async (gid: string) => {
    await fetch(`/api/customers/${id}/groups`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remove_group_ids: [gid] }), cache: 'no-store',
    })
    await fetchCustomer()
  }

  const addGroup = async (gid: string) => {
    await fetch(`/api/customers/${id}/groups`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ add_group_ids: [gid] }), cache: 'no-store',
    })
    await fetchCustomer()
  }

  /* -- Field updater ------------------------------------------------- */
  const setField = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const setCgField = (k: string, v: string) => setCaregiverForm(p => ({ ...p, [k]: v }))

  /* -- Render helpers ------------------------------------------------ */
  const Field = ({ label, name, type = 'text', visibilityKey }: {
    label: string; name: string; type?: string; visibilityKey?: string
  }) => {
    const state = visibilityKey
      ? getCustomerFieldState(visibility, 'backend', visibilityKey)
      : { visible: true, required: false }
    if (!state.visible) return null
    return (
      <div>
        <label className={labelCls}>{label}{state.required ? ' *' : ''}</label>
        <input type={type} className={inputCls} value={(form[name] as string) ?? ''} onChange={e => setField(name, e.target.value)} disabled={saving} required={state.required} />
      </div>
    )
  }

  const Select = ({ label, name, options, visibilityKey }: {
    label: string; name: string; options: string[]; visibilityKey?: string
  }) => {
    const state = visibilityKey
      ? getCustomerFieldState(visibility, 'backend', visibilityKey)
      : { visible: true, required: false }
    if (!state.visible) return null
    return (
      <div>
        <label className={labelCls}>{label}{state.required ? ' *' : ''}</label>
        <select className={inputCls} value={(form[name] as string) ?? ''} onChange={e => setField(name, e.target.value)} disabled={saving} required={state.required}>
          <option value="">--</option>
          {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
      </div>
    )
  }

  const CgField = ({ label, name, type = 'text', visibilityKey }: {
    label: string; name: string; type?: string; visibilityKey?: string
  }) => {
    const state = visibilityKey
      ? getCustomerFieldState(visibility, 'backend', visibilityKey)
      : { visible: true, required: false }
    if (!state.visible) return null
    return (
      <div>
        <label className={labelCls}>{label}{state.required ? ' *' : ''}</label>
        <input type={type} className={inputCls} value={(caregiverForm as Record<string, string>)[name] ?? ''} onChange={e => setCgField(name, e.target.value)} disabled={saving} required={state.required} />
      </div>
    )
  }

  if (loading || !customer) return <div className="min-h-screen bg-bg flex items-center justify-center"><div className="text-secondary">Loading...</div></div>

  const medExpired = customer.medical_card_expiration ? new Date(customer.medical_card_expiration) < new Date() : false
  const TAB_LABELS = ['Details', 'ID & Address', ...(isMedical ? ['Caregiver'] : []), 'Loyalty & Groups', 'Purchase History', 'Transaction History']
  // Map visual tab index to logical tab id
  const tabId = (idx: number): number => {
    if (!isMedical && idx >= 2) return idx + 1 // skip caregiver slot
    return idx
  }
  const activeTabId = tabId(tab)

  const typeBadge = (t: string | null | undefined) => {
    const label = t || 'recreational'
    const cls = label === 'medical' ? 'bg-info/50 text-info border-info' : 'bg-accent/50 text-accent border-accent'
    return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
  }

  const statusBadge = (s: string | null | undefined) => {
    const label = s || 'active'
    const m: Record<string, string> = { active: 'bg-accent/50 text-accent', banned: 'bg-danger/50 text-danger', inactive: 'bg-raised text-secondary' }
    return <span className={`text-xs px-2 py-0.5 rounded-full ${m[label] ?? m.inactive}`}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
  }

  /* ================================================================== */
  return (
    <div className="min-h-screen bg-bg text-primary p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/customers')} className="p-2 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold">{fullName(customer)}</h1>
            <div className="flex items-center gap-2 mt-1">{typeBadge(customer.customer_type)} {statusBadge(customer.status)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className={btnSecondary} onClick={() => setTab(TAB_LABELS.indexOf('Purchase History'))}>Product History</button>
          <button className={btnSecondary} onClick={() => setTab(TAB_LABELS.indexOf('Transaction History'))}>Transaction History</button>
          <div className="relative">
            <button className={btnSecondary} onClick={() => setActionsOpen(p => !p)}>Actions <span className="ml-1">&#9662;</span></button>
            {actionsOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-surface border border-edge rounded-lg shadow-xl z-50">
                {customer.status === 'banned'
                  ? <button className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-raised rounded-t-lg" onClick={() => { unbanCustomer(); setActionsOpen(false) }}>Unban Customer</button>
                  : <button className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-raised rounded-t-lg" onClick={() => { banCustomer(); setActionsOpen(false) }}>Ban Customer</button>
                }
                <button className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-raised rounded-b-lg" onClick={() => { archiveCustomer(); setActionsOpen(false) }}>Archive</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Lifetime Spend', value: fmtMoney(customer.lifetime_spend) },
          { label: 'Visit Count', value: String(customer.visit_count) },
          { label: 'Loyalty Points', value: `${customer.loyalty_points}${customer.loyalty_tier ? ` (${customer.loyalty_tier})` : ''}` },
          { label: 'Last Visit', value: relativeDate(customer.last_visit_at) },
          { label: 'Customer Since', value: fmtDate(customer.created_at) },
          { label: 'Medical Card', value: isMedical ? (medExpired ? 'Expired' : 'Valid') : 'N/A' },
        ].map(c => (
          <div key={c.label} className="bg-surface rounded-xl border border-edge p-4">
            <p className="text-xs text-secondary uppercase">{c.label}</p>
            <p className="text-lg font-semibold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-edge flex gap-1">
        {TAB_LABELS.map((l, i) => <button key={l} className={tabCls(tab === i)} onClick={() => setTab(i)}>{l}</button>)}
      </div>
      {formError && <p className="text-sm text-danger">{formError}</p>}

      {/* Tab 0: Details */}
      {activeTabId === 0 && (
        <div className={sectionCls}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Select label="Customer Type" name="customer_type" options={CUSTOMER_TYPE_OPTIONS} visibilityKey="type" />
            <Field label="Prefix" name="prefix" visibilityKey="prefix" />
            <Field label="First Name" name="first_name" visibilityKey="name" />
            <Field label="Middle Name" name="middle_name" visibilityKey="middle_name" />
            <Field label="Last Name" name="last_name" visibilityKey="last_name" />
            <Field label="Suffix" name="suffix" visibilityKey="suffix" />
            <Select label="Gender" name="gender" options={GENDER_OPTIONS} visibilityKey="gender" />
            <Field label="Pronoun" name="pronoun" />
            <Field label="Date of Birth" name="date_of_birth" type="date" visibilityKey="dob" />
            <Select label="Status" name="status" options={STATUS_OPTIONS} visibilityKey="status" />
          </div>
          {getCustomerFieldState(visibility, 'backend', 'notes').visible && <div className="mt-4">
            <label className={labelCls}>Notes{getCustomerFieldState(visibility, 'backend', 'notes').required ? ' *' : ''}</label>
            <textarea className={`${inputCls} h-24 py-2`} value={(form.notes as string) ?? ''} onChange={e => setField('notes', e.target.value)} disabled={saving} required={getCustomerFieldState(visibility, 'backend', 'notes').required} />
          </div>}
          <div className="mt-4 flex justify-end"><button className={btnPrimary} onClick={saveDetails} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
        </div>
      )}

      {/* Tab 1: ID & Address */}
      {activeTabId === 1 && (
        <div className={sectionCls}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="MJ State ID" name="medical_card_number" visibilityKey="mmj_id" />
            <Field label="ID Start Date" name="id_start_date" type="date" />
            <Field label="ID Expiration" name="id_expiration" type="date" visibilityKey="id_expiration" />
            <Field label="Address Line 1" name="address_line1" visibilityKey="address1" />
            <Field label="Address Line 2" name="address_line2" visibilityKey="address2" />
            <Field label="City" name="city" visibilityKey="city" />
            <Field label="State" name="state" visibilityKey="state" />
            <Field label="ZIP" name="zip" visibilityKey="zip" />
            <Field label="Driver's License" name="drivers_license" visibilityKey="drivers_license" />
            <Field label="DL Expiration" name="drivers_license_expiration" type="date" visibilityKey="drivers_license_exp" />
            <Field label="Phone" name="phone" visibilityKey="phone" />
            <Field label="Mobile Phone" name="mobile_phone" visibilityKey="mobile_phone" />
            <Field label="Email" name="email" type="email" visibilityKey="email" />
          </div>
          <div className="mt-4 flex justify-end"><button className={btnPrimary} onClick={saveIdAddress} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
        </div>
      )}

      {/* Tab 2: Caregiver (medical only) */}
      {activeTabId === 2 && isMedical && (
        <div className={sectionCls}>
          <h3 className="text-lg font-semibold mb-4">Caregiver Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <CgField label="First Name" name="first_name" visibilityKey="caregiver_first" />
            <CgField label="Last Name" name="last_name" visibilityKey="caregiver_last" />
            <CgField label="State ID" name="state_id" />
            <CgField label="ID Start Date" name="id_start_date" type="date" />
            <CgField label="ID Expiration" name="id_expiration" type="date" />
            <CgField label="Address Line 1" name="address1" />
            <CgField label="Address Line 2" name="address2" />
            <CgField label="City" name="city" />
            <CgField label="State" name="state" />
            <CgField label="ZIP" name="zip" />
            <CgField label="Phone" name="phone" visibilityKey="caregiver_phone" />
            <CgField label="Email" name="email" type="email" visibilityKey="caregiver_email" />
            <CgField label="Date of Birth" name="dob" type="date" />
          </div>
          <div className="mt-4">
            <label className={labelCls}>Notes</label>
            <textarea className={`${inputCls} h-20 py-2`} value={caregiverForm.notes ?? ''} onChange={e => setCgField('notes', e.target.value)} disabled={saving} />
          </div>
          <div className="mt-4 flex justify-end"><button className={btnPrimary} onClick={saveCaregiver} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
        </div>
      )}

      {/* Tab 3: Loyalty & Groups */}
      {activeTabId === 3 && (
        <div className="space-y-6">
          {/* Loyalty */}
          <div className={sectionCls}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Loyalty Points</h3>
                <p className="text-3xl font-bold text-accent mt-1">{customer.loyalty_points}
                  {customer.loyalty_tier && <span className="ml-2 text-sm bg-accent/50 text-accent border border-accent px-2 py-0.5 rounded-full">{customer.loyalty_tier}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-end gap-3 mb-6">
              <div className="flex-1">
                <label className={labelCls}>Adjust Points (+/-)</label>
                <input type="number" className={inputCls} value={adjustPts.points} onChange={e => setAdjustPts(p => ({ ...p, points: e.target.value }))} placeholder="+100 or -50" />
              </div>
              <div className="flex-[2]">
                <label className={labelCls}>Reason</label>
                <input className={inputCls} value={adjustPts.reason} onChange={e => setAdjustPts(p => ({ ...p, reason: e.target.value }))} placeholder="Reason for adjustment" />
              </div>
              <button className={btnPrimary} onClick={adjustPoints} disabled={saving}>Adjust</button>
            </div>
            {/* History table */}
            <h4 className="text-sm font-medium text-secondary uppercase mb-2">Point History</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-secondary border-b border-edge">
                  <th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4 text-right">Points</th><th className="pb-2 pr-4 text-right">Balance After</th><th className="pb-2">Reason</th>
                </tr></thead>
                <tbody>
                  {loyaltyHistory?.map(h => (
                    <tr key={h.id} className="border-b border-edge/50">
                      <td className="py-2 pr-4">{fmtDate(h.created_at)}</td>
                      <td className="py-2 pr-4">{h.points_change > 0 ? <span className="text-accent">Earn</span> : <span className="text-danger">{h.reason?.toLowerCase().includes('redeem') ? 'Redeem' : 'Adjust'}</span>}</td>
                      <td className="py-2 pr-4 text-right">{h.points_change > 0 ? '+' : ''}{h.points_change}</td>
                      <td className="py-2 pr-4 text-right">{h.balance_after}</td>
                      <td className="py-2 text-secondary">{h.reason ?? '--'}</td>
                    </tr>
                  ))}
                  {loyaltyHistory?.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted">No point history</td></tr>}
                  {!loyaltyHistory && <tr><td colSpan={5} className="py-4 text-center text-muted">Loading...</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Groups */}
          <div className={sectionCls}>
            <h3 className="text-lg font-semibold mb-4">Groups</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {customer.groups.map(g => (
                <span key={g.id} className="inline-flex items-center gap-1 bg-raised text-primary text-sm px-3 py-1 rounded-full">
                  {g.name}
                  <button onClick={() => removeGroup(g.id)} className="ml-1 text-secondary hover:text-danger">&times;</button>
                </span>
              ))}
              {customer.groups.length === 0 && <span className="text-muted text-sm">No groups assigned</span>}
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className={labelCls}>Add to Group</label>
                <select className={inputCls} defaultValue="" onChange={e => { if (e.target.value) { addGroup(e.target.value); e.target.value = '' } }}>
                  <option value="">Select a group...</option>
                  {availableGroups.filter(g => !customer.groups.some(cg => cg.id === g.id)).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Badges */}
          <BadgesSection customerId={id} />
        </div>
      )}

      {/* Tab 4: Purchase History */}
      {activeTabId === 4 && (
        <div className={sectionCls}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-secondary border-b border-edge">
                <th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Product</th><th className="pb-2 pr-4">SKU</th><th className="pb-2 pr-4 text-right">Qty</th><th className="pb-2 pr-4 text-right">Price</th><th className="pb-2 text-right">Total</th>
              </tr></thead>
              <tbody>
                {purchases?.map(p => (
                  <tr key={p.id} className="border-b border-edge/50">
                    <td className="py-2 pr-4">{fmtDate(p.created_at)}</td>
                    <td className="py-2 pr-4">{p.product_name}</td>
                    <td className="py-2 pr-4 text-secondary">{p.sku ?? '--'}</td>
                    <td className="py-2 pr-4 text-right">{p.quantity}</td>
                    <td className="py-2 pr-4 text-right">{fmtMoney(p.unit_price)}</td>
                    <td className="py-2 text-right">{fmtMoney(p.total)}</td>
                  </tr>
                ))}
                {purchases?.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted">No purchase history</td></tr>}
                {!purchases && <tr><td colSpan={6} className="py-4 text-center text-muted">Loading...</td></tr>}
              </tbody>
            </table>
          </div>
          {purchaseTotal > 20 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-secondary">{purchaseTotal} total items</span>
              <div className="flex gap-2">
                <button className={btnSecondary} disabled={purchasePage <= 1} onClick={() => fetchPurchases(purchasePage - 1)}>Prev</button>
                <span className="text-sm text-secondary self-center">Page {purchasePage} of {Math.ceil(purchaseTotal / 20)}</span>
                <button className={btnSecondary} disabled={purchasePage >= Math.ceil(purchaseTotal / 20)} onClick={() => fetchPurchases(purchasePage + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Transaction History */}
      {activeTabId === 5 && (
        <div className={sectionCls}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-secondary border-b border-edge">
                <th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4 text-right">Items</th><th className="pb-2 pr-4 text-right">Total</th><th className="pb-2 pr-4">Status</th><th className="pb-2">Payment</th>
              </tr></thead>
              <tbody>
                {transactions?.map(t => (
                  <tr key={t.id} className="border-b border-edge/50 cursor-pointer hover:bg-raised/30" onClick={() => router.push('/reports/transactions')}>
                    <td className="py-2 pr-4">{fmtDate(t.created_at)}</td>
                    <td className="py-2 pr-4 capitalize">{t.transaction_type}</td>
                    <td className="py-2 pr-4 text-right">{t.line_count}</td>
                    <td className="py-2 pr-4 text-right">{fmtMoney(t.total)}</td>
                    <td className="py-2 pr-4">{statusBadge(t.status)}</td>
                    <td className="py-2 text-secondary">{t.payment_method ?? '--'}</td>
                  </tr>
                ))}
                {transactions?.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted">No transaction history</td></tr>}
                {!transactions && <tr><td colSpan={6} className="py-4 text-center text-muted">Loading...</td></tr>}
              </tbody>
            </table>
          </div>
          {txTotal > 20 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-secondary">{txTotal} total transactions</span>
              <div className="flex gap-2">
                <button className={btnSecondary} disabled={txPage <= 1} onClick={() => fetchTransactions(txPage - 1)}>Prev</button>
                <span className="text-sm text-secondary self-center">Page {txPage} of {Math.ceil(txTotal / 20)}</span>
                <button className={btnSecondary} disabled={txPage >= Math.ceil(txTotal / 20)} onClick={() => fetchTransactions(txPage + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Close actions dropdown on outside click */}
      {actionsOpen && <div className="fixed inset-0 z-40" onClick={() => setActionsOpen(false)} />}
    </div>
  )
}
