'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'

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

const ORDER_TYPES = [
  { key: 'walk_in', label: 'Walk-in' },
  { key: 'curbside', label: 'Curbside' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'delivery', label: 'Delivery' },
]

interface OrderSource {
  id: string
  name: string
}

export default function OrderWorkflowPage() {
  const pathname = usePathname()
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [orderSources, setOrderSources] = useState<OrderSource[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newSource, setNewSource] = useState('')

  const fetchData = useCallback(async () => {
    const [settingsRes, sourcesRes] = await Promise.all([
      fetch('/api/registers/configure/settings', { cache: 'no-store' }),
      fetch('/api/registers/configure/order-sources', { cache: 'no-store' }),
    ])
    if (settingsRes.ok) {
      const data = await settingsRes.json()
      setSettings(data.settings ?? {})
    }
    if (sourcesRes.ok) {
      const data = await sourcesRes.json()
      setOrderSources(data.sources ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const enabledOrderTypes = (settings.enabled_order_types as string[] | undefined) ?? []
  const workflowType = (settings.workflow_type as string | undefined) ?? 'traditional'
  const defaultOrderSource = (settings.default_order_source as string | undefined) ?? ''

  const toggleOrderType = (key: string) => {
    const current = [...enabledOrderTypes]
    const idx = current.indexOf(key)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(key)
    }
    setSettings(prev => ({ ...prev, enabled_order_types: current }))
  }

  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const saveSettings = async () => {
    setSaving(true)
    setSaveMsg(null)
    const res = await fetch('/api/registers/configure/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) {
      setSaveMsg('Settings saved')
      setTimeout(() => setSaveMsg(null), 3000)
    } else {
      setSaveMsg('Failed to save')
    }
    setSaving(false)
  }

  const addSource = async () => {
    if (!newSource.trim()) return
    const res = await fetch('/api/registers/configure/order-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSource.trim() }),
    })
    if (res.ok) {
      setNewSource('')
      await fetchData()
    }
  }

  const removeSource = async (id: string) => {
    const res = await fetch(`/api/registers/configure/order-sources/${id}`, {
      method: 'DELETE',
    })
    if (res.ok) await fetchData()
  }

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-gray-700 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              pathname === tab.href
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <h1 className="text-xl font-bold text-gray-50 mb-6">Order Workflow</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          {/* Order Types */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase mb-3">Enabled Order Types</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ORDER_TYPES.map(ot => (
                <label key={ot.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabledOrderTypes.includes(ot.key)}
                    onChange={() => toggleOrderType(ot.key)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-50">{ot.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Workflow Type */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase mb-3">Workflow Type</h2>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="workflow_type"
                  checked={workflowType === 'traditional'}
                  onChange={() => setSettings(prev => ({ ...prev, workflow_type: 'traditional' }))}
                  className="w-4 h-4 border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm text-gray-50">Traditional Checkout</span>
                  <p className="text-xs text-gray-500 mt-0.5">Orders are created, filled, and completed by the same individual</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="workflow_type"
                  checked={workflowType === 'fulfillment'}
                  onChange={() => setSettings(prev => ({ ...prev, workflow_type: 'fulfillment' }))}
                  className="w-4 h-4 border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm text-gray-50">Fulfillment</span>
                  <p className="text-xs text-gray-500 mt-0.5">Orders are created by one person and fulfilled by another (e.g., online orders queued for a budtender to pack)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Default Order Source */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase mb-3">Default Order Source</h2>
            <div className="max-w-xs">
              <label className={labelCls}>Source</label>
              <select
                value={defaultOrderSource}
                onChange={e => setSettings(prev => ({ ...prev, default_order_source: e.target.value }))}
                className={inputCls}
              >
                <option value="">-- Select --</option>
                {orderSources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Manual Order Sources */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase mb-3">Manual Order Sources</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {orderSources.length === 0 ? (
                <p className="text-sm text-gray-500">No order sources configured</p>
              ) : orderSources.map(src => (
                <span key={src.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-full text-sm text-gray-50">
                  {src.name}
                  <button onClick={() => removeSource(src.id)} className="text-gray-400 hover:text-red-400" aria-label={`Remove ${src.name}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 max-w-sm">
              <input
                type="text"
                value={newSource}
                onChange={e => setNewSource(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSource() }}
                placeholder="New source name"
                className={inputCls}
              />
              <button onClick={addSource} disabled={!newSource.trim()} className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap">
                Add Source
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={saveSettings} disabled={saving} className="px-6 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveMsg && <span className={`text-sm ${saveMsg.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>{saveMsg}</span>}
          </div>
        </>
      )}
    </div>
  )
}
