'use client'

import { useState, useEffect, useCallback } from 'react'

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

interface BiotrackConfig {
  is_enabled: boolean
  state_code: string
  xml_api_url: string
  rest_api_url: string
  username: string
  password: string
  ubi: string
  biotrack_location_id: string
  use_training_mode: boolean
  use_other_plant_material: boolean
  use_allotment_check: boolean
  report_discounted_prices: boolean
  enable_deliveries: boolean
  use_lab_data: boolean
  default_labs_in_receive: boolean
  display_approval_date: boolean
  schedule_returns_for_destruction: boolean
}

interface DestructionItem {
  id: string
  biotrack_id: string
  item_type: string
  quantity: number
  eligible_on: string
  reason: string
  status: string
}

const OPTION_TOGGLES: { key: keyof BiotrackConfig; label: string; description: string }[] = [
  { key: 'use_training_mode', label: 'Training Mode', description: 'Send data to BioTrack training environment instead of production' },
  { key: 'use_other_plant_material', label: 'Use Other Plant Material', description: 'Track other plant material in BioTrack reporting' },
  { key: 'use_allotment_check', label: 'Allotment Check', description: 'Verify patient allotment with BioTrack before completing sale' },
  { key: 'report_discounted_prices', label: 'Report Discounted Prices', description: 'Send discounted prices to BioTrack instead of original prices' },
  { key: 'enable_deliveries', label: 'Enable Deliveries', description: 'Report delivery transactions to BioTrack' },
  { key: 'use_lab_data', label: 'Use Lab Data', description: 'Pull lab results from BioTrack for inventory items' },
  { key: 'default_labs_in_receive', label: 'Default Labs in Receive', description: 'Automatically fetch lab data when receiving inventory' },
  { key: 'display_approval_date', label: 'Display Approval Date', description: 'Show BioTrack approval date on inventory items' },
  { key: 'schedule_returns_for_destruction', label: 'Schedule Returns for Destruction', description: 'Automatically queue returned items for BioTrack destruction reporting' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-900/50 text-amber-300 border border-amber-700',
  eligible: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700',
  submitted: 'bg-blue-900/50 text-blue-300 border border-blue-700',
  confirmed: 'bg-gray-700 text-gray-300 border border-gray-600',
  failed: 'bg-red-900/50 text-red-300 border border-red-700',
}

const DEFAULT_CONFIG: BiotrackConfig = {
  is_enabled: false,
  state_code: 'NM',
  xml_api_url: '',
  rest_api_url: '',
  username: '',
  password: '',
  ubi: '',
  biotrack_location_id: '',
  use_training_mode: false,
  use_other_plant_material: false,
  use_allotment_check: false,
  report_discounted_prices: false,
  enable_deliveries: false,
  use_lab_data: false,
  default_labs_in_receive: false,
  display_approval_date: false,
  schedule_returns_for_destruction: false,
}

/** Sanitize API response: convert null values to defaults so controlled inputs never receive null */
function sanitizeConfig(raw: Record<string, unknown>): BiotrackConfig {
  const result = { ...DEFAULT_CONFIG }
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof BiotrackConfig)[]) {
    const val = raw[key]
    if (val === null || val === undefined) continue
    if (typeof DEFAULT_CONFIG[key] === 'string') {
      (result as Record<string, unknown>)[key] = String(val)
    } else if (typeof DEFAULT_CONFIG[key] === 'boolean') {
      (result as Record<string, unknown>)[key] = Boolean(val)
    }
  }
  return result
}

interface ConnectionTestResult {
  v3: { status: 'success' | 'failed' | 'skipped'; message: string; latencyMs?: number }
  v1: { status: 'success' | 'failed' | 'skipped'; message: string; latencyMs?: number }
  overall: 'connected' | 'partial' | 'disconnected'
}

export default function BiotrackPage() {
  const [config, setConfig] = useState<BiotrackConfig>(DEFAULT_CONFIG)
  const [queue, setQueue] = useState<DestructionItem[]>([])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const [cRes, qRes] = await Promise.all([
      fetch('/api/settings/biotrack-config', { cache: 'no-store' }),
      fetch('/api/settings/biotrack-config/destruction-queue', { cache: 'no-store' }),
    ])
    if (cRes.ok) {
      const d = await cRes.json()
      if (d.config) setConfig(sanitizeConfig(d.config))
    }
    if (qRes.ok) {
      const d = await qRes.json()
      setQueue(d.items ?? [])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateField = <K extends keyof BiotrackConfig>(key: K, value: BiotrackConfig[K]) => {
    setConfig(c => ({ ...c, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/settings/biotrack-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      cache: 'no-store',
    })
    setSaving(false)
    if (res.ok) {
      setMsg({ type: 'ok', text: 'BioTrack configuration saved' })
    } else {
      const d = await res.json().catch(() => ({}))
      setMsg({ type: 'err', text: d.error ?? 'Failed to save configuration' })
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/biotrack-config/test-connection', {
        method: 'POST',
        cache: 'no-store',
      })
      const d = await res.json()
      if (res.ok && d.result) {
        setTestResult(d.result)
      } else {
        setMsg({ type: 'err', text: d.error ?? 'Connection test failed' })
      }
    } catch {
      setMsg({ type: 'err', text: 'Failed to reach test endpoint' })
    }
    setTesting(false)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-50 mb-6">BioTrack Integration</h1>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Connection Settings */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-50 mb-4">Connection Settings</h2>
        <div className="space-y-4">
          {/* Enabled toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-200">Enable BioTrack Integration</span>
              <p className="text-xs text-gray-500 mt-0.5">Connect to BioTrack for state traceability compliance</p>
            </div>
            <button
              onClick={() => updateField('is_enabled', !config.is_enabled)}
              className={`w-11 h-6 rounded-full transition-colors ${config.is_enabled ? 'bg-emerald-600' : 'bg-gray-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${config.is_enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">State Code</label>
              <select value={config.state_code} onChange={e => updateField('state_code', e.target.value)} className={inputCls}>
                <option value="NM">NM - New Mexico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">UBI</label>
              <input value={config.ubi} onChange={e => updateField('ubi', e.target.value)} placeholder="Universal Business Identifier" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">BioTrack Location ID</label>
              <input value={config.biotrack_location_id} onChange={e => updateField('biotrack_location_id', e.target.value)} placeholder="e.g. 220091005" className={inputCls} />
            </div>
            <div />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">XML API URL</label>
              <input value={config.xml_api_url} onChange={e => updateField('xml_api_url', e.target.value)} placeholder="https://wslcb.mjtraceability.com/serverjson.asp" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">REST API URL</label>
              <input value={config.rest_api_url} onChange={e => updateField('rest_api_url', e.target.value)} placeholder="https://api.biotrackthc.net/v1" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Username</label>
              <input value={config.username} onChange={e => updateField('username', e.target.value)} placeholder="BioTrack username" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <input type="password" value={config.password} onChange={e => updateField('password', e.target.value)} placeholder="BioTrack password" className={inputCls} />
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-50 mb-4">Options</h2>
        <div className="space-y-4">
          {OPTION_TOGGLES.map(opt => (
            <div key={opt.key} className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-200">{opt.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </div>
              <button
                onClick={() => updateField(opt.key, !config[opt.key])}
                className={`w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${config[opt.key] ? 'bg-emerald-600' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${config[opt.key] ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save + Test */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        <button
          onClick={testConnection}
          disabled={testing}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
        >
          {testing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Testing...
            </>
          ) : 'Test Connection'}
        </button>
      </div>

      {/* Connection Test Results */}
      {testResult && (
        <div className={`mb-6 rounded-xl border p-5 ${
          testResult.overall === 'connected' ? 'bg-emerald-900/30 border-emerald-700' :
          testResult.overall === 'partial' ? 'bg-amber-900/30 border-amber-700' :
          'bg-red-900/30 border-red-700'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${
              testResult.overall === 'connected' ? 'bg-emerald-400' :
              testResult.overall === 'partial' ? 'bg-amber-400' :
              'bg-red-400'
            }`} />
            <span className="text-sm font-semibold text-gray-50">
              {testResult.overall === 'connected' ? 'Connected to BioTrack' :
               testResult.overall === 'partial' ? 'Partial Connection' :
               'Not Connected'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                testResult.v3.status === 'success' ? 'bg-emerald-800 text-emerald-200' :
                testResult.v3.status === 'failed' ? 'bg-red-800 text-red-200' :
                'bg-gray-700 text-gray-400'
              }`}>v3 REST</span>
              <span className="text-sm text-gray-300">{testResult.v3.message}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                testResult.v1.status === 'success' ? 'bg-emerald-800 text-emerald-200' :
                testResult.v1.status === 'failed' ? 'bg-red-800 text-red-200' :
                'bg-gray-700 text-gray-400'
              }`}>v1 XML</span>
              <span className="text-sm text-gray-300">{testResult.v1.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Destruction Queue */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-50">Destruction Queue</h2>
          <p className="text-xs text-gray-500 mt-1">Items scheduled for destruction reporting to BioTrack</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">BioTrack ID</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-right px-4 py-3">Quantity</th>
              <th className="text-left px-4 py-3">Eligible On</th>
              <th className="text-left px-4 py-3">Reason</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {queue.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No items in destruction queue</td></tr>
            )}
            {queue.map(item => (
              <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-4 py-2.5 text-gray-50 font-mono text-xs">{item.biotrack_id}</td>
                <td className="px-4 py-2.5 text-gray-300 capitalize">{item.item_type}</td>
                <td className="px-4 py-2.5 text-right text-gray-300">{item.quantity}</td>
                <td className="px-4 py-2.5 text-gray-400">{item.eligible_on ? new Date(item.eligible_on).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-2.5 text-gray-400">{item.reason}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[item.status] ?? 'bg-gray-700 text-gray-300'}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
