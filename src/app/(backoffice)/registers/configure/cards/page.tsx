'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  buildCustomerCardPatch,
  type CustomerCardFieldKey,
  type CustomerCardFields,
  type CustomerCardStatusKey,
} from '@/lib/customers/cardFields'

const TABS = [
  { label: 'Guestlist Status', href: '/registers/configure/guestlist' },
  { label: 'Cards', href: '/registers/configure/cards' },
]

const CARD_FIELDS: Array<{ key: CustomerCardFieldKey; label: string; defaultOn: boolean }> = [
  { key: 'address', label: 'Address', defaultOn: true },
  { key: 'customer_name', label: 'Customer name', defaultOn: true },
  { key: 'date_received', label: 'Date received', defaultOn: true },
  { key: 'discount_group', label: 'Discount group', defaultOn: true },
  { key: 'drivers_license_number', label: "Driver's license number", defaultOn: false },
  { key: 'loyal_vs_non_loyal', label: 'Loyal vs. Non-loyal', defaultOn: true },
  { key: 'medical_card_id', label: 'Medical card id', defaultOn: true },
  { key: 'nickname', label: 'Nickname', defaultOn: true },
  { key: 'order_source', label: 'Order source', defaultOn: true },
  { key: 'payment_status', label: 'Payment status', defaultOn: true },
  { key: 'register', label: 'Register', defaultOn: true },
  { key: 'state', label: 'State', defaultOn: true },
  { key: 'total_value_in_cart', label: 'Total value of items in cart', defaultOn: true },
  { key: 'transaction_reference', label: 'Transaction reference number', defaultOn: true },
  { key: 'customer_dob', label: 'Customer date of birth', defaultOn: true },
  { key: 'customer_type', label: 'Customer type', defaultOn: true },
  { key: 'delivery_vehicle', label: 'Delivery vehicle', defaultOn: true },
  { key: 'drivers_license_exp', label: "Driver's license exp date", defaultOn: true },
  { key: 'last_purchase_date', label: 'Last purchase date', defaultOn: true },
  { key: 'med_card_exp', label: 'Med card exp date', defaultOn: true },
  { key: 'new_vs_existing', label: 'New vs. Existing customer', defaultOn: true },
  { key: 'num_items_in_cart', label: 'Number of items in cart', defaultOn: true },
  { key: 'order_type', label: 'Order type', defaultOn: true },
  { key: 'pronouns', label: 'Pronouns', defaultOn: false },
  { key: 'room', label: 'Room', defaultOn: true },
  { key: 'time_window', label: 'Time window', defaultOn: true },
  { key: 'transaction_notes', label: 'Transaction notes', defaultOn: false },
]

const CARD_STATUSES = [
  { value: 'online_order_placed', label: 'Online Order Placed' },
  { value: 'walk_in', label: 'Walk In' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
]

/* Preview mock data */
const PREVIEW = {
  name: 'Jane Joe',
  nickname: 'Janey',
  dob: '04/20/2021',
  address: '123 Evergreen Drive, Apt 1',
  cityStateZip: 'Bend, OR 97703',
  idExpires: '04/20/2035',
  customerType: 'Medical',
  mmjId: '123456',
  mmjExpires: '04/20/2035',
  received: 'Apr 19, 2021 | 9:20 AM',
  window: 'Apr 19, 2021 | 9:20 AM',
  lastPurchase: 'Apr 19, 2021 | 9:20 AM',
  discountGroups: 'Friends & Family',
  status: 'Unpaid',
  order: 'Weedmaps | Delivery',
  room: '101',
  ref: '123456789',
  vehicle: 'Wagon',
  register: 'REGISTER 1',
}

export default function CardsConfigPage() {
  const pathname = usePathname()
  const [cardStatus, setCardStatus] = useState<CustomerCardStatusKey>('online_order_placed')
  const [fieldConfig, setFieldConfig] = useState<CustomerCardFields>({})
  const [pendingPatch, setPendingPatch] = useState<CustomerCardFields>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const defaultFields = Object.fromEntries(CARD_FIELDS.map(f => [f.key, f.defaultOn]))
  const currentFields = { ...defaultFields, ...fieldConfig[cardStatus] }

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/registers/configure/settings', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      const saved = data.settings?.customer_card_fields as CustomerCardFields | undefined
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        setFieldConfig(saved)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { void Promise.resolve().then(fetchData) }, [fetchData])

  const toggleField = (key: CustomerCardFieldKey) => {
    const nextValue = !currentFields[key]
    const leaf = buildCustomerCardPatch(cardStatus, key, nextValue).customer_card_fields
    setFieldConfig(prev => ({
      ...prev,
      [cardStatus]: { ...currentFields, [key]: nextValue },
    }))
    setPendingPatch(prev => ({
      ...prev,
      [cardStatus]: { ...prev[cardStatus], ...leaf[cardStatus] },
    }))
  }

  const save = async () => {
    if (Object.keys(pendingPatch).length === 0) return
    setSaving(true)
    setError('')
    const response = await fetch('/api/registers/configure/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_card_fields: pendingPatch }),
    })
    if (response.ok) setPendingPatch({})
    else setError('Unable to save card fields. Please try again.')
    setSaving(false)
  }

  /* Which preview fields to show based on current checkboxes */
  const show = (key: CustomerCardFieldKey) => currentFields[key] !== false

  /* Split fields into two columns */
  const half = Math.ceil(CARD_FIELDS.length / 2)
  const col1 = CARD_FIELDS.slice(0, half)
  const col2 = CARD_FIELDS.slice(half)

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-edge mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <Link key={tab.href} href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${pathname === tab.href ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="space-y-8">
        {/* Card Attributes */}
        <div>
          <h1 className="text-xl font-bold text-primary mb-1">Card attributes</h1>
          <p className="text-sm text-secondary mb-5">Attributes for customer cards. These will show the following information based on the status of a customer&apos;s order.</p>

          {/* Card Status Selector */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-secondary uppercase mb-1">Card status:</label>
            <select value={cardStatus} onChange={e => setCardStatus(e.target.value as CustomerCardStatusKey)}
              className="w-full max-w-xs h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent">
              {CARD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {loading ? <p className="text-muted">Loading...</p> : (
            <>
              {/* Two-column checkbox grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6">
                <div className="space-y-3">
                  {col1.map(f => (
                    <label key={f.key} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={currentFields[f.key] !== false} onChange={() => toggleField(f.key)}
                        className="w-4 h-4 rounded border-edge-strong bg-bg text-accent focus:ring-accent focus:ring-offset-0" />
                      <span className="text-sm text-primary">{f.label}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-3">
                  {col2.map(f => (
                    <label key={f.key} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={currentFields[f.key] !== false} onChange={() => toggleField(f.key)}
                        className="w-4 h-4 rounded border-edge-strong bg-bg text-accent focus:ring-accent focus:ring-offset-0" />
                      <span className="text-sm text-primary">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={save} disabled={saving} className="px-6 py-2.5 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            </>
          )}
        </div>

        {/* Card Preview */}
        <div>
          <h2 className="text-lg font-semibold text-primary mb-4">Card Preview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Compact card */}
          <div>
            <p className="text-xs text-muted mb-2 font-medium uppercase">Compact View</p>
            <div className="bg-surface border border-edge rounded-xl p-5 text-sm max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-bold text-base text-primary">{PREVIEW.name}</span>
                {show('new_vs_existing') && <span className="text-[10px] px-1.5 py-0.5 bg-accent/50 text-accent rounded-full border border-accent">New</span>}
              </div>
              <div className="space-y-2 text-xs">
                {show('nickname') && <Row label="Nickname" value={PREVIEW.nickname} />}
                {show('customer_dob') && <Row label="DOB" value={PREVIEW.dob} />}
                {show('address') && <><Row label="Address" value={PREVIEW.address} /><Row label="" value={PREVIEW.cityStateZip} /></>}
                {show('drivers_license_exp') && <Row label="ID Expires" value={PREVIEW.idExpires} />}
                {show('customer_type') && <Row label="Customer Type" value={PREVIEW.customerType} highlight />}
                {show('medical_card_id') && <Row label="MMJ ID" value={PREVIEW.mmjId} />}
                {show('med_card_exp') && <Row label="MMJ Expires" value={PREVIEW.mmjExpires} />}
                {(show('date_received') || show('time_window') || show('last_purchase_date')) && <div className="border-t border-edge pt-2 mt-2" />}
                {show('date_received') && <Row label="Received" value={PREVIEW.received} />}
                {show('time_window') && <Row label="Window" value={PREVIEW.window} />}
                {show('last_purchase_date') && <Row label="Last Purchase" value={PREVIEW.lastPurchase} />}
                {show('discount_group') && <Row label="Discount Groups" value={PREVIEW.discountGroups} />}
                {show('payment_status') && <Row label="Status" value={PREVIEW.status} />}
                {show('order_source') && <Row label="Order" value={PREVIEW.order} />}
                {show('room') && <Row label="Room" value={PREVIEW.room} />}
                {show('transaction_reference') && <Row label="REF" value={PREVIEW.ref} />}
                {show('delivery_vehicle') && <><div className="border-t border-edge pt-2 mt-2" /><Row label="Vehicle" value={PREVIEW.vehicle} /></>}
              </div>
              {show('register') && <div className="pt-3"><span className="text-[10px] px-2 py-1 bg-raised text-secondary rounded border border-edge-strong font-medium">{PREVIEW.register}</span></div>}
            </div>
          </div>

          {/* Expanded card */}
          <div>
            <p className="text-xs text-muted mb-2 font-medium uppercase">Expanded View</p>
            <div className="bg-surface border border-edge rounded-xl p-5 text-xs">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-bold text-base text-primary">{PREVIEW.name}</span>
                {show('new_vs_existing') && <span className="text-[10px] px-1.5 py-0.5 bg-accent/50 text-accent rounded-full border border-accent">New</span>}
              </div>
              <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-2">
                {show('nickname') && <><span className="text-muted">Nickname:</span><span className="text-primary">{PREVIEW.nickname}</span></>}
                {show('customer_dob') && <><span className="text-muted">DOB:</span><span className="text-primary">{PREVIEW.dob}</span></>}
                {show('address') && <><span className="text-muted">Address:</span><span className="text-primary col-span-3">{PREVIEW.address}, {PREVIEW.cityStateZip}</span></>}
                {show('drivers_license_exp') && <><span className="text-muted">ID Expires:</span><span className="text-primary">{PREVIEW.idExpires}</span></>}
                {show('customer_type') && <><span className="text-muted">Customer Type:</span><span className="text-accent font-medium">{PREVIEW.customerType}</span></>}
                {show('medical_card_id') && <><span className="text-muted">MMJ ID:</span><span className="text-primary">{PREVIEW.mmjId}</span></>}
                {show('med_card_exp') && <><span className="text-muted">MMJ Expires:</span><span className="text-primary">{PREVIEW.mmjExpires}</span></>}
                {show('date_received') && <><span className="text-muted">Received:</span><span className="text-primary">{PREVIEW.received}</span></>}
                {show('time_window') && <><span className="text-muted">Window:</span><span className="text-primary">{PREVIEW.window}</span></>}
                {show('last_purchase_date') && <><span className="text-muted">Last Purchase:</span><span className="text-primary">{PREVIEW.lastPurchase}</span></>}
                {show('discount_group') && <><span className="text-muted">Discount Groups:</span><span className="text-primary">{PREVIEW.discountGroups}</span></>}
                {show('payment_status') && <><span className="text-muted">Status:</span><span className="text-primary">{PREVIEW.status}</span></>}
                {show('order_source') && <><span className="text-muted">Order:</span><span className="text-primary">{PREVIEW.order}</span></>}
                {show('room') && <><span className="text-muted">Room:</span><span className="text-primary">{PREVIEW.room}</span></>}
                {show('transaction_reference') && <><span className="text-muted">REF:</span><span className="text-primary">{PREVIEW.ref}</span></>}
                {show('delivery_vehicle') && <><span className="text-muted">Vehicle:</span><span className="text-primary">{PREVIEW.vehicle}</span></>}
              </div>
              {show('register') && <div className="mt-4 flex justify-end"><span className="text-[10px] px-2 py-1 bg-raised text-secondary rounded border border-edge-strong font-medium">{PREVIEW.register}</span></div>}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-2">
      {label && <span className="text-muted shrink-0 min-w-[90px]">{label}:</span>}
      <span className={highlight ? 'text-accent font-medium' : 'text-primary'}>{value}</span>
    </div>
  )
}
