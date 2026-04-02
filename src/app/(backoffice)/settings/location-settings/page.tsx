'use client'

import { useState, useEffect, useCallback } from 'react'

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

type Settings = Record<string, boolean | string | number>

interface ToggleField {
  key: string
  label: string
}

interface NumberField {
  key: string
  label: string
  placeholder?: string
}

interface DropdownField {
  key: string
  label: string
  options: { value: string; label: string }[]
}

interface Section {
  id: string
  title: string
  dropdown?: DropdownField
  toggles?: ToggleField[]
  numbers?: NumberField[]
}

const ROUNDING_OPTIONS = [
  { value: 'none', label: 'No Rounding' },
  { value: 'round_up_025', label: 'Round Up to $0.25' },
  { value: 'round_up_050', label: 'Round Up to $0.50' },
  { value: 'round_up_100', label: 'Round Up to $1.00' },
  { value: 'round_down_025', label: 'Round Down to $0.25' },
  { value: 'round_down_050', label: 'Round Down to $0.50' },
  { value: 'round_down_100', label: 'Round Down to $1.00' },
  { value: 'round_nearest_005', label: 'Round Nearest $0.05' },
  { value: 'round_nearest_010', label: 'Round Nearest $0.10' },
  { value: 'round_nearest_025', label: 'Round Nearest $0.25' },
  { value: 'round_nearest_050', label: 'Round Nearest $0.50' },
]

const SECTIONS: Section[] = [
  {
    id: 'rounding',
    title: 'Rounding',
    dropdown: {
      key: 'rounding_method',
      label: 'Rounding Method',
      options: ROUNDING_OPTIONS,
    },
  },
  {
    id: 'pos',
    title: 'Point of Sale',
    toggles: [
      { key: 'require_customer_checkout', label: 'Require customer at checkout' },
      { key: 'show_customer_dob_checkout', label: 'Show customer DOB at checkout' },
      { key: 'require_id_scan', label: 'Require ID scan' },
      { key: 'show_product_notes', label: 'Show product notes' },
      { key: 'auto_close_drawer', label: 'Auto-close cash drawer' },
      { key: 'allow_partial_payments', label: 'Allow partial payments' },
      { key: 'enable_tips', label: 'Enable tips' },
      { key: 'show_loyalty_in_pos', label: 'Show loyalty balance in POS' },
      { key: 'require_manager_discount_approval', label: 'Require manager approval for discounts' },
      { key: 'allow_price_overrides', label: 'Allow price overrides' },
      { key: 'show_cost_in_pos', label: 'Show cost in POS' },
      { key: 'enable_product_bundles', label: 'Enable product bundles' },
      { key: 'quick_add_customer', label: 'Quick add customer' },
      { key: 'show_allotment_warning', label: 'Show allotment warning' },
      { key: 'auto_print_receipt', label: 'Auto-print receipt' },
      { key: 'auto_print_label', label: 'Auto-print label' },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    toggles: [
      { key: 'show_cost_on_reports', label: 'Show cost on reports' },
      { key: 'enable_audit_trail', label: 'Enable audit trail' },
      { key: 'allow_bulk_operations', label: 'Allow bulk operations' },
      { key: 'enable_export', label: 'Enable data export' },
      { key: 'show_margin_on_reports', label: 'Show margin on reports' },
      { key: 'enable_scheduled_reports', label: 'Enable scheduled reports' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    toggles: [
      { key: 'auto_deduct_on_sale', label: 'Auto-deduct inventory on sale' },
      { key: 'enable_batch_tracking', label: 'Enable batch tracking' },
      { key: 'enable_lot_tracking', label: 'Enable lot tracking' },
      { key: 'show_testing_status', label: 'Show testing status' },
      { key: 'require_lab_before_sale', label: 'Require lab results before sale' },
      { key: 'enable_quarantine_workflow', label: 'Enable quarantine workflow' },
      { key: 'auto_sync_biotrack', label: 'Auto-sync with BioTrack' },
      { key: 'show_flower_equivalent', label: 'Show flower equivalent' },
      { key: 'enable_inventory_alerts', label: 'Enable low inventory alerts' },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    toggles: [
      { key: 'sync_weedmaps', label: 'Sync with Weedmaps' },
      { key: 'sync_leafly', label: 'Sync with Leafly' },
      { key: 'sync_springbig', label: 'Sync with SpringBig' },
      { key: 'sync_headset', label: 'Sync with Headset' },
    ],
  },
  {
    id: 'mobile',
    title: 'Mobile Checkout',
    toggles: [
      { key: 'enable_mobile_pos', label: 'Enable mobile POS' },
      { key: 'require_wifi', label: 'Require Wi-Fi connection' },
      { key: 'allow_offline_mode', label: 'Allow offline mode' },
      { key: 'auto_sync_reconnect', label: 'Auto-sync on reconnect' },
    ],
  },
  {
    id: 'pricing',
    title: 'Item Pricing',
    toggles: [
      { key: 'show_original_price_discounted', label: 'Show original price when discounted' },
      { key: 'apply_loyalty_before_tax', label: 'Apply loyalty before tax' },
      { key: 'apply_discounts_before_tax', label: 'Apply discounts before tax' },
      { key: 'enable_price_scheduling', label: 'Enable price scheduling' },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    numbers: [
      { key: 'password_min_length', label: 'Minimum Password Length', placeholder: '8' },
      { key: 'password_expiration_days', label: 'Password Expiration (days)', placeholder: '90' },
    ],
  },
]

export default function LocationSettingsPage() {
  const [settings, setSettings] = useState<Settings>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    SECTIONS.forEach(s => { init[s.id] = true })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/settings/location-settings', { cache: 'no-store' })
    if (res.ok) {
      const d = await res.json()
      setSettings(d.settings ?? {})
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleSection = (id: string) => {
    setExpanded(e => ({ ...e, [id]: !e[id] }))
  }

  const updateSetting = (key: string, value: boolean | string | number) => {
    setSettings(s => ({ ...s, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/settings/location-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
      cache: 'no-store',
    })
    setSaving(false)
    if (res.ok) {
      setMsg({ type: 'ok', text: 'Location settings saved successfully' })
    } else {
      const d = await res.json().catch(() => ({}))
      setMsg({ type: 'err', text: d.error ?? 'Failed to save settings' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Location Settings</h1>
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-3">
        {SECTIONS.map(section => (
          <div key={section.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {/* Section Header — clickable to expand/collapse */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-700/30 transition-colors"
            >
              <h2 className="text-base font-semibold text-gray-50">{section.title}</h2>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expanded[section.id] ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Section Content */}
            {expanded[section.id] && (
              <div className="px-6 pb-5 space-y-4 border-t border-gray-700">
                {/* Dropdown field */}
                {section.dropdown && (
                  <div className="pt-4">
                    <label className="block text-xs text-gray-400 mb-1">{section.dropdown.label}</label>
                    <select
                      value={(settings[section.dropdown.key] as string) ?? 'none'}
                      onChange={e => updateSetting(section.dropdown!.key, e.target.value)}
                      className={inputCls + ' max-w-md'}
                    >
                      {section.dropdown.options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Toggle fields */}
                {section.toggles && section.toggles.map(t => (
                  <div key={t.key} className="flex items-center justify-between first:pt-4">
                    <span className="text-sm text-gray-300">{t.label}</span>
                    <button
                      onClick={() => updateSetting(t.key, !settings[t.key])}
                      className={`w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${settings[t.key] ? 'bg-emerald-600' : 'bg-gray-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${settings[t.key] ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                ))}

                {/* Number fields */}
                {section.numbers && (
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    {section.numbers.map(n => (
                      <div key={n.key}>
                        <label className="block text-xs text-gray-400 mb-1">{n.label}</label>
                        <input
                          type="number"
                          value={(settings[n.key] as number) ?? ''}
                          onChange={e => updateSetting(n.key, e.target.value ? parseInt(e.target.value, 10) : '')}
                          placeholder={n.placeholder}
                          className={inputCls + ' max-w-xs'}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom save button */}
      <div className="mt-6 flex items-center gap-4">
        <button onClick={save} disabled={saving} className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {msg && (
          <span className={`text-sm ${msg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</span>
        )}
      </div>
    </div>
  )
}
