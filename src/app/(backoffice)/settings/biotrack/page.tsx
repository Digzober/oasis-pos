'use client'

import { useState, useEffect, useCallback } from 'react'
import { DENSE_BESPOKE_TABLE_CLASS } from '@/lib/constants/tableDensity'

const inputCls = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'

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
  { key: 'use_allotment_check', label: 'Allotment Check', description: 'Verify patient allotment with BioTrack before completing sale' },
  { key: 'report_discounted_prices', label: 'Report Discounted Prices', description: 'Send discounted prices to BioTrack instead of original prices' },
  { key: 'enable_deliveries', label: 'Enable Deliveries', description: 'Report delivery transactions to BioTrack' },
  { key: 'use_lab_data', label: 'Use Lab Data', description: 'Pull lab results from BioTrack for inventory items' },
  { key: 'default_labs_in_receive', label: 'Default Labs in Receive', description: 'Automatically fetch lab data when receiving inventory' },
  { key: 'display_approval_date', label: 'Display Approval Date', description: 'Show BioTrack approval date on inventory items' },
  { key: 'schedule_returns_for_destruction', label: 'Schedule Returns for Destruction', description: 'Automatically queue returned items for BioTrack destruction reporting' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/50 text-warning border border-warning',
  eligible: 'bg-accent/50 text-accent border border-accent',
  submitted: 'bg-info/50 text-info border border-info',
  confirmed: 'bg-raised text-secondary border border-edge-strong',
  failed: 'bg-danger/50 text-danger border border-danger',
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

  useEffect(() => { void Promise.resolve().then(load) }, [load])

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
      <h1 className="text-xl font-bold text-primary mb-6">BioTrack Integration</h1>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-accent/50 text-accent border border-accent' : 'bg-danger/50 text-danger border border-danger'}`}>
          {msg.text}
        </div>
      )}

      {/* Connection Settings */}
      <div className="bg-surface rounded-xl border border-edge p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Connection Settings</h2>
        <div className="space-y-4">
          {/* Enabled toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-primary">Enable BioTrack Integration</span>
              <p className="text-xs text-muted mt-0.5">Connect to BioTrack for state traceability compliance</p>
            </div>
            <button
              onClick={() => updateField('is_enabled', !config.is_enabled)}
              className={`w-11 h-6 rounded-full transition-colors ${config.is_enabled ? 'bg-accent' : 'bg-raised'}`}
            >
              <div className={`w-4 h-4 bg-surface rounded-full mx-1 transition-transform ${config.is_enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">State Code</label>
              <select value={config.state_code} onChange={e => updateField('state_code', e.target.value)} className={inputCls}>
                <option value="NM">NM - New Mexico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">UBI</label>
              <input value={config.ubi} onChange={e => updateField('ubi', e.target.value)} placeholder="Universal Business Identifier" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">BioTrack Location ID</label>
              <input value={config.biotrack_location_id} onChange={e => updateField('biotrack_location_id', e.target.value)} placeholder="e.g. 220091005" className={inputCls} />
            </div>
            <div />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">XML API URL</label>
              <input value={config.xml_api_url} onChange={e => updateField('xml_api_url', e.target.value)} placeholder="https://wslcb.mjtraceability.com/serverjson.asp" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">REST API URL</label>
              <input value={config.rest_api_url} onChange={e => updateField('rest_api_url', e.target.value)} placeholder="https://api.biotrackthc.net/v1" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Username</label>
              <input value={config.username} onChange={e => updateField('username', e.target.value)} placeholder="BioTrack username" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Password</label>
              <input type="password" value={config.password} onChange={e => updateField('password', e.target.value)} placeholder="BioTrack password" className={inputCls} />
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="bg-surface rounded-xl border border-edge p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Options</h2>
        <div className="space-y-4">
          {OPTION_TOGGLES.map(opt => (
            <div key={opt.key} className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-primary">{opt.label}</span>
                <p className="text-xs text-muted mt-0.5">{opt.description}</p>
              </div>
              <button
                onClick={() => updateField(opt.key, !config[opt.key])}
                className={`w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${config[opt.key] ? 'bg-accent' : 'bg-raised'}`}
              >
                <div className={`w-4 h-4 bg-surface rounded-full mx-1 transition-transform ${config[opt.key] ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save + Test */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="px-5 py-2 bg-accent text-primary rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        <button
          onClick={testConnection}
          disabled={testing}
          className="px-5 py-2 bg-info text-primary rounded-lg text-sm font-medium hover:bg-info disabled:opacity-50 flex items-center gap-2"
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
          testResult.overall === 'connected' ? 'bg-accent/30 border-accent' :
          testResult.overall === 'partial' ? 'bg-warning/30 border-warning' :
          'bg-danger/30 border-danger'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${
              testResult.overall === 'connected' ? 'bg-accent' :
              testResult.overall === 'partial' ? 'bg-warning' :
              'bg-danger'
            }`} />
            <span className="text-sm font-semibold text-primary">
              {testResult.overall === 'connected' ? 'Connected to BioTrack' :
               testResult.overall === 'partial' ? 'Partial Connection' :
               'Not Connected'}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                testResult.v3.status === 'success' ? 'bg-accent text-accent' :
                testResult.v3.status === 'failed' ? 'bg-danger text-danger' :
                'bg-raised text-secondary'
              }`}>v3 REST</span>
              <span className="text-sm text-secondary">{testResult.v3.message}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                testResult.v1.status === 'success' ? 'bg-accent text-accent' :
                testResult.v1.status === 'failed' ? 'bg-danger text-danger' :
                'bg-raised text-secondary'
              }`}>v1 XML</span>
              <span className="text-sm text-secondary">{testResult.v1.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Destruction Queue */}
      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <div className="px-6 py-4 border-b border-edge">
          <h2 className="text-lg font-semibold text-primary">Destruction Queue</h2>
          <p className="text-xs text-muted mt-1">Items scheduled for destruction reporting to BioTrack</p>
        </div>
          <table data-density="compact" className={`${DENSE_BESPOKE_TABLE_CLASS} w-full`}>
          <thead>
            <tr className="border-b border-edge text-secondary text-xs uppercase">
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
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No items in destruction queue</td></tr>
            )}
            {queue.map(item => (
              <tr key={item.id} className="border-b border-edge/50 hover:bg-raised/30">
                <td className="px-4 py-2.5 text-primary font-mono text-xs">{item.biotrack_id}</td>
                <td className="px-4 py-2.5 text-secondary capitalize">{item.item_type}</td>
                <td className="px-4 py-2.5 text-right text-secondary">{item.quantity}</td>
                <td className="px-4 py-2.5 text-secondary">{item.eligible_on ? new Date(item.eligible_on).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-2.5 text-secondary">{item.reason}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${STATUS_COLORS[item.status] ?? 'bg-raised text-secondary'}`}>
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
