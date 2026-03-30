'use client'
import { useState, useEffect, useRef, use } from 'react'

const SETTING_CATEGORIES = [
  { key: 'pos', label: 'POS', settings: [
    { key: 'require_customer', label: 'Require customer on every sale', type: 'toggle' },
    { key: 'auto_apply_discounts', label: 'Auto-apply eligible discounts', type: 'toggle' },
    { key: 'allow_zero_price', label: 'Allow zero-price items', type: 'toggle' },
    { key: 'print_receipt_auto', label: 'Auto-print receipt after sale', type: 'toggle' },
  ]},
  { key: 'inventory', label: 'Inventory', settings: [
    { key: 'low_stock_threshold', label: 'Low stock alert threshold', type: 'number' },
    { key: 'auto_deduct_on_sale', label: 'Auto-deduct inventory on sale', type: 'toggle' },
    { key: 'enable_reservations', label: 'Enable online order reservations', type: 'toggle' },
  ]},
  { key: 'compliance', label: 'Compliance', settings: [
    { key: 'enforce_purchase_limits', label: 'Enforce NM purchase limits', type: 'toggle' },
    { key: 'require_id_verification', label: 'Require ID verification', type: 'toggle' },
    { key: 'biotrack_auto_sync', label: 'Auto-sync sales to BioTrack', type: 'toggle' },
  ]},
  { key: 'online', label: 'Online Ordering', settings: [
    { key: 'enable_online_ordering', label: 'Enable online ordering', type: 'toggle' },
    { key: 'pickup_window_minutes', label: 'Pickup window (minutes)', type: 'number' },
    { key: 'max_advance_order_days', label: 'Max advance order days', type: 'number' },
  ]},
]

export default function LocationSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    fetch(`/api/locations/${id}/settings`).then(r => r.json()).then(d => { setSettings(d.settings ?? {}); setLoaded(true) })
  }, [id])

  const updateSetting = (key: string, value: unknown) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch(`/api/locations/${id}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) })
    }, 500)
  }

  if (!loaded) return <p className="text-gray-500">Loading...</p>

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-50 mb-6">Location Settings</h1>
      {SETTING_CATEGORIES.map(cat => (
        <div key={cat.key} className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">{cat.label}</h3>
          <div className="space-y-3">
            {cat.settings.map(s => (
              <div key={s.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{s.label}</span>
                {s.type === 'toggle' ? (
                  <button onClick={() => updateSetting(s.key, !settings[s.key])}
                    className={`w-10 h-6 rounded-full transition-colors ${settings[s.key] ? 'bg-emerald-600' : 'bg-gray-600'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${settings[s.key] ? 'translate-x-4' : ''}`} />
                  </button>
                ) : (
                  <input type="number" value={settings[s.key] ?? ''} onChange={e => updateSetting(s.key, Number(e.target.value))}
                    className="w-20 h-8 px-2 bg-gray-900 border border-gray-600 rounded text-gray-50 text-sm text-right" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
