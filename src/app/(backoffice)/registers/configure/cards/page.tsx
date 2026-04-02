'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Guestlist Status', href: '/registers/configure/guestlist' },
  { label: 'Order Workflow', href: '/registers/configure/workflow' },
  { label: 'Cards', href: '/registers/configure/cards' },
  { label: 'Adjustments', href: '/registers/configure/adjustments' },
  { label: 'Returns', href: '/registers/configure/returns' },
  { label: 'Cancellations', href: '/registers/configure/cancellations' },
  { label: 'Voids', href: '/registers/configure/voids' },
  { label: 'Settings', href: '/registers/configure/settings' },
]

const CARD_FIELDS: Array<{ key: string; label: string; defaultOn: boolean }> = [
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
  const [cardStatus, setCardStatus] = useState('online_order_placed')
  const [fieldConfig, setFieldConfig] = useState<Record<string, Record<string, boolean>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const currentFields = fieldConfig[cardStatus] ?? Object.fromEntries(CARD_FIELDS.map(f => [f.key, f.defaultOn]))

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/registers/configure/settings', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      const saved = data.settings?.customer_card_fields as Record<string, Record<string, boolean>> | undefined
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        setFieldConfig(saved)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleField = (key: string) => {
    setFieldConfig(prev => ({
      ...prev,
      [cardStatus]: { ...currentFields, [key]: !currentFields[key] },
    }))
  }

  const save = async () => {
    setSaving(true)
    await fetch('/api/registers/configure/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_card_fields: fieldConfig }),
    })
    setSaving(false)
  }

  /* Which preview fields to show based on current checkboxes */
  const show = (key: string) => currentFields[key] !== false

  /* Split fields into two columns */
  const half = Math.ceil(CARD_FIELDS.length / 2)
  const col1 = CARD_FIELDS.slice(0, half)
  const col2 = CARD_FIELDS.slice(half)

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-gray-700 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <Link key={tab.href} href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${pathname === tab.href ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="space-y-8">
        {/* Card Attributes */}
        <div>
          <h1 className="text-xl font-bold text-gray-50 mb-1">Card attributes</h1>
          <p className="text-sm text-gray-400 mb-5">Attributes for customer cards. These will show the following information based on the status of a customer's order.</p>

          {/* Card Status Selector */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Card status:</label>
            <select value={cardStatus} onChange={e => setCardStatus(e.target.value)}
              className="w-full max-w-xs h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {CARD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {loading ? <p className="text-gray-500">Loading...</p> : (
            <>
              {/* Two-column checkbox grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6">
                <div className="space-y-3">
                  {col1.map(f => (
                    <label key={f.key} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={currentFields[f.key] !== false} onChange={() => toggleField(f.key)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0" />
                      <span className="text-sm text-gray-200">{f.label}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-3">
                  {col2.map(f => (
                    <label key={f.key} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={currentFields[f.key] !== false} onChange={() => toggleField(f.key)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0" />
                      <span className="text-sm text-gray-200">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={save} disabled={saving} className="px-6 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>

        {/* Card Preview */}
        <div>
          <h2 className="text-lg font-semibold text-gray-50 mb-4">Card Preview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Compact card */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Compact View</p>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-sm max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-bold text-base text-gray-50">{PREVIEW.name}</span>
                {show('new_vs_existing') && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 rounded-full border border-emerald-700">New</span>}
              </div>
              <div className="space-y-2 text-xs">
                {show('nickname') && <Row label="Nickname" value={PREVIEW.nickname} />}
                {show('customer_dob') && <Row label="DOB" value={PREVIEW.dob} />}
                {show('address') && <><Row label="Address" value={PREVIEW.address} /><Row label="" value={PREVIEW.cityStateZip} /></>}
                {show('drivers_license_exp') && <Row label="ID Expires" value={PREVIEW.idExpires} />}
                {show('customer_type') && <Row label="Customer Type" value={PREVIEW.customerType} highlight />}
                {show('medical_card_id') && <Row label="MMJ ID" value={PREVIEW.mmjId} />}
                {show('med_card_exp') && <Row label="MMJ Expires" value={PREVIEW.mmjExpires} />}
                {(show('date_received') || show('time_window') || show('last_purchase_date')) && <div className="border-t border-gray-700 pt-2 mt-2" />}
                {show('date_received') && <Row label="Received" value={PREVIEW.received} />}
                {show('time_window') && <Row label="Window" value={PREVIEW.window} />}
                {show('last_purchase_date') && <Row label="Last Purchase" value={PREVIEW.lastPurchase} />}
                {show('discount_group') && <Row label="Discount Groups" value={PREVIEW.discountGroups} />}
                {show('payment_status') && <Row label="Status" value={PREVIEW.status} />}
                {show('order_source') && <Row label="Order" value={PREVIEW.order} />}
                {show('room') && <Row label="Room" value={PREVIEW.room} />}
                {show('transaction_reference') && <Row label="REF" value={PREVIEW.ref} />}
                {show('delivery_vehicle') && <><div className="border-t border-gray-700 pt-2 mt-2" /><Row label="Vehicle" value={PREVIEW.vehicle} /></>}
              </div>
              {show('register') && <div className="pt-3"><span className="text-[10px] px-2 py-1 bg-gray-700 text-gray-300 rounded border border-gray-600 font-medium">{PREVIEW.register}</span></div>}
            </div>
          </div>

          {/* Expanded card */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Expanded View</p>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-xs">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-bold text-base text-gray-50">{PREVIEW.name}</span>
                {show('new_vs_existing') && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 rounded-full border border-emerald-700">New</span>}
              </div>
              <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-2">
                {show('nickname') && <><span className="text-gray-500">Nickname:</span><span className="text-gray-200">{PREVIEW.nickname}</span></>}
                {show('customer_dob') && <><span className="text-gray-500">DOB:</span><span className="text-gray-200">{PREVIEW.dob}</span></>}
                {show('address') && <><span className="text-gray-500">Address:</span><span className="text-gray-200 col-span-3">{PREVIEW.address}, {PREVIEW.cityStateZip}</span></>}
                {show('drivers_license_exp') && <><span className="text-gray-500">ID Expires:</span><span className="text-gray-200">{PREVIEW.idExpires}</span></>}
                {show('customer_type') && <><span className="text-gray-500">Customer Type:</span><span className="text-emerald-400 font-medium">{PREVIEW.customerType}</span></>}
                {show('medical_card_id') && <><span className="text-gray-500">MMJ ID:</span><span className="text-gray-200">{PREVIEW.mmjId}</span></>}
                {show('med_card_exp') && <><span className="text-gray-500">MMJ Expires:</span><span className="text-gray-200">{PREVIEW.mmjExpires}</span></>}
                {show('date_received') && <><span className="text-gray-500">Received:</span><span className="text-gray-200">{PREVIEW.received}</span></>}
                {show('time_window') && <><span className="text-gray-500">Window:</span><span className="text-gray-200">{PREVIEW.window}</span></>}
                {show('last_purchase_date') && <><span className="text-gray-500">Last Purchase:</span><span className="text-gray-200">{PREVIEW.lastPurchase}</span></>}
                {show('discount_group') && <><span className="text-gray-500">Discount Groups:</span><span className="text-gray-200">{PREVIEW.discountGroups}</span></>}
                {show('payment_status') && <><span className="text-gray-500">Status:</span><span className="text-gray-200">{PREVIEW.status}</span></>}
                {show('order_source') && <><span className="text-gray-500">Order:</span><span className="text-gray-200">{PREVIEW.order}</span></>}
                {show('room') && <><span className="text-gray-500">Room:</span><span className="text-gray-200">{PREVIEW.room}</span></>}
                {show('transaction_reference') && <><span className="text-gray-500">REF:</span><span className="text-gray-200">{PREVIEW.ref}</span></>}
                {show('delivery_vehicle') && <><span className="text-gray-500">Vehicle:</span><span className="text-gray-200">{PREVIEW.vehicle}</span></>}
              </div>
              {show('register') && <div className="mt-4 flex justify-end"><span className="text-[10px] px-2 py-1 bg-gray-700 text-gray-300 rounded border border-gray-600 font-medium">{PREVIEW.register}</span></div>}
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
      {label && <span className="text-gray-500 shrink-0 min-w-[90px]">{label}:</span>}
      <span className={highlight ? 'text-emerald-400 font-medium' : 'text-gray-200'}>{value}</span>
    </div>
  )
}

