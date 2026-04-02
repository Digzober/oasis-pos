'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

interface DutchieConfig {
  isEnabled: boolean
  apiKey: string
  dutchieLocationId: string
  dutchieLocationName: string
  syncEmployees: boolean
  syncCustomers: boolean
  syncProducts: boolean
  syncInventory: boolean
  syncRooms: boolean
  lastSyncedEmployeesAt: string | null
  lastSyncedCustomersAt: string | null
  lastSyncedProductsAt: string | null
  lastSyncedInventoryAt: string | null
  lastSyncedRoomsAt: string | null
  lastSyncedReferenceAt: string | null
}

interface SyncEntityResult {
  entityType: string
  fetched: number
  created: number
  updated: number
  skipped: number
  errors: number
  duration: number
}

interface SyncLogEntry {
  id: string
  entity_type: string
  sync_type: string
  status: string
  started_at: string | null
  completed_at: string | null
  records_fetched: number | null
  records_created: number | null
  records_updated: number | null
  records_skipped: number | null
  records_errored: number | null
  duration_ms: number | null
  error_message: string | null
  created_at: string
}

const DEFAULT_CONFIG: DutchieConfig = {
  isEnabled: false,
  apiKey: '',
  dutchieLocationId: '',
  dutchieLocationName: '',
  syncEmployees: true,
  syncCustomers: true,
  syncProducts: true,
  syncInventory: true,
  syncRooms: true,
  lastSyncedEmployeesAt: null,
  lastSyncedCustomersAt: null,
  lastSyncedProductsAt: null,
  lastSyncedInventoryAt: null,
  lastSyncedRoomsAt: null,
  lastSyncedReferenceAt: null,
}

const ENTITY_TYPES = [
  { key: 'employees' as const, label: 'Employees', configKey: 'syncEmployees' as const, tsKey: 'lastSyncedEmployeesAt' as const },
  { key: 'customers' as const, label: 'Customers', configKey: 'syncCustomers' as const, tsKey: 'lastSyncedCustomersAt' as const },
  { key: 'products' as const, label: 'Products', configKey: 'syncProducts' as const, tsKey: 'lastSyncedProductsAt' as const },
  { key: 'inventory' as const, label: 'Inventory', configKey: 'syncInventory' as const, tsKey: 'lastSyncedInventoryAt' as const },
  { key: 'rooms' as const, label: 'Rooms', configKey: 'syncRooms' as const, tsKey: 'lastSyncedRoomsAt' as const },
] as const

function sanitizeConfig(raw: Record<string, unknown>): DutchieConfig {
  const result = { ...DEFAULT_CONFIG }
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof DutchieConfig)[]) {
    const val = raw[key]
    if (val === null || val === undefined) continue
    if (typeof DEFAULT_CONFIG[key] === 'string') {
      (result as Record<string, unknown>)[key] = String(val)
    } else if (typeof DEFAULT_CONFIG[key] === 'boolean') {
      (result as Record<string, unknown>)[key] = Boolean(val)
    } else {
      (result as Record<string, unknown>)[key] = val
    }
  }
  // Coalesce nullable timestamp fields
  for (const et of ENTITY_TYPES) {
    if (raw[et.tsKey] === null || raw[et.tsKey] === undefined) {
      (result as Record<string, unknown>)[et.tsKey] = null
    }
  }
  if (raw.lastSyncedReferenceAt === null || raw.lastSyncedReferenceAt === undefined) {
    result.lastSyncedReferenceAt = null
  }
  return result
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

function fmtDuration(ms: number | null): string {
  if (!ms) return '--'
  if (ms < 1000) return `${ms}ms`
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function DutchieSettingsPage() {
  const [config, setConfig] = useState<DutchieConfig>(DEFAULT_CONFIG)
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncingEntity, setSyncingEntity] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'connected' | 'failed'>('none')
  const [connectionInfo, setConnectionInfo] = useState<string | null>(null)
  const [syncResults, setSyncResults] = useState<SyncEntityResult[] | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/dutchie-config', { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        if (d.config) {
          setConfig(sanitizeConfig(d.config))
          // Infer connection status from dutchieLocationName
          if (d.config.dutchieLocationName) {
            setConnectionStatus('connected')
            setConnectionInfo(d.config.dutchieLocationName)
          }
        }
      }
    } catch (err) {
      logger.error('Failed to load Dutchie config', { error: String(err) })
    }
  }, [])

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/dutchie/sync/log?limit=20', { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setSyncLogs(d.logs ?? [])
      }
    } catch (err) {
      logger.error('Failed to load sync logs', { error: String(err) })
    }
  }, [])

  useEffect(() => {
    loadConfig()
    loadLogs()
  }, [loadConfig, loadLogs])

  const updateField = <K extends keyof DutchieConfig>(key: K, value: DutchieConfig[K]) => {
    setConfig(c => ({ ...c, [key]: value }))
  }

  const saveSettings = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/dutchie-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: config.isEnabled,
          apiKey: config.apiKey,
          syncEmployees: config.syncEmployees,
          syncCustomers: config.syncCustomers,
          syncProducts: config.syncProducts,
          syncInventory: config.syncInventory,
          syncRooms: config.syncRooms,
        }),
        cache: 'no-store',
      })
      if (res.ok) {
        const d = await res.json()
        if (d.config) setConfig(sanitizeConfig(d.config))
        setMsg({ type: 'ok', text: 'Dutchie configuration saved' })
      } else {
        const d = await res.json().catch(() => ({}))
        setMsg({ type: 'err', text: d.error ?? 'Failed to save configuration' })
      }
    } catch {
      setMsg({ type: 'err', text: 'Network error saving configuration' })
    }
    setSaving(false)
  }

  const testConnection = async () => {
    setTesting(true)
    setConnectionStatus('none')
    setConnectionInfo(null)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/dutchie-config/test-connection', {
        method: 'POST',
        cache: 'no-store',
      })
      const d = await res.json()
      if (d.success) {
        setConnectionStatus('connected')
        setConnectionInfo(d.locationName ?? 'Connected')
        setMsg({ type: 'ok', text: `Connected to Dutchie: ${d.locationName}` })
        loadConfig()
      } else {
        setConnectionStatus('failed')
        setConnectionInfo(null)
        setMsg({ type: 'err', text: d.error ?? 'Connection test failed' })
      }
    } catch {
      setConnectionStatus('failed')
      setMsg({ type: 'err', text: 'Failed to reach test endpoint' })
    }
    setTesting(false)
  }

  const runSync = async (entityTypes?: string[]) => {
    setSyncing(true)
    setSyncResults(null)
    setMsg(null)
    if (entityTypes && entityTypes.length === 1) {
      setSyncingEntity(entityTypes[0])
    } else {
      setSyncingEntity('all')
    }

    try {
      const res = await fetch('/api/dutchie/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entityTypes ? { entityTypes } : {}),
        cache: 'no-store',
      })
      const d = await res.json()
      if (res.ok && d.results) {
        setSyncResults(d.results)
        setMsg({ type: 'ok', text: 'Sync completed successfully' })
        loadConfig()
        loadLogs()
      } else {
        setMsg({ type: 'err', text: d.error ?? 'Sync failed' })
      }
    } catch {
      setMsg({ type: 'err', text: 'Network error during sync' })
    }
    setSyncing(false)
    setSyncingEntity(null)
  }

  const statusDot = connectionStatus === 'connected'
    ? 'bg-emerald-500'
    : connectionStatus === 'failed'
      ? 'bg-red-500'
      : 'bg-gray-500'

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-50">Dutchie Integration</h1>
        <div className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
        {connectionInfo && (
          <span className="text-sm text-gray-400">{connectionInfo}</span>
        )}
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
          msg.type === 'ok'
            ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
            : 'bg-red-900/50 text-red-300 border border-red-700'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Section 1: Connection */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-50 mb-4">Connection</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.apiKey ?? ''}
                onChange={e => updateField('apiKey', e.target.value)}
                placeholder="Enter Dutchie API key"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={testing || !config.apiKey}
              className="px-4 py-2 text-sm bg-gray-700 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {testing && <span className="w-3.5 h-3.5 border-2 border-gray-400/30 border-t-gray-200 rounded-full animate-spin" />}
              Test Connection
            </button>
            {connectionStatus === 'connected' && connectionInfo && (
              <span className="text-sm text-emerald-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {connectionInfo}
              </span>
            )}
            {connectionStatus === 'failed' && (
              <span className="text-sm text-red-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Connection failed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Sync Settings */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-50 mb-4">Sync Settings</h2>
        <div className="space-y-3">
          {ENTITY_TYPES.map(et => (
            <div key={et.key} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-200">{et.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Last synced: {relativeTime(config[et.tsKey])}
                </p>
              </div>
              <button
                onClick={() => updateField(et.configKey, !config[et.configKey])}
                className={`w-11 h-6 rounded-full transition-colors shrink-0 ${
                  config[et.configKey] ? 'bg-emerald-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${
                  config[et.configKey] ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Section 3: Actions */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-50 mb-4">Actions</h2>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => runSync()}
            disabled={syncing}
            className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {syncing && syncingEntity === 'all' && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Sync All
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ENTITY_TYPES.map(et => (
            <button
              key={et.key}
              onClick={() => runSync([et.key])}
              disabled={syncing || !config[et.configKey]}
              className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncing && syncingEntity === et.key && (
                <span className="w-3 h-3 border-2 border-gray-400/30 border-t-gray-200 rounded-full animate-spin" />
              )}
              Sync {et.label}
            </button>
          ))}
        </div>

        {/* Sync Results */}
        {syncResults && syncResults.length > 0 && (
          <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-200">Sync Results</h3>
              <button
                onClick={() => setSyncResults(null)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Dismiss
              </button>
            </div>
            <div className="space-y-2">
              {syncResults.map(r => (
                <div key={r.entityType} className="flex items-center gap-4 text-sm">
                  <span className="text-gray-50 font-medium min-w-[100px] capitalize">{r.entityType}</span>
                  <div className="flex gap-4 text-xs">
                    <div><span className="text-gray-500">Fetched:</span> <span className="text-gray-200 font-mono">{r.fetched}</span></div>
                    <div><span className="text-gray-500">Created:</span> <span className="text-emerald-400 font-mono">{r.created}</span></div>
                    <div><span className="text-gray-500">Updated:</span> <span className="text-blue-400 font-mono">{r.updated}</span></div>
                    <div><span className="text-gray-500">Skipped:</span> <span className="text-gray-400 font-mono">{r.skipped}</span></div>
                    {r.errors > 0 && (
                      <div><span className="text-gray-500">Errors:</span> <span className="text-red-400 font-mono">{r.errors}</span></div>
                    )}
                    <div><span className="text-gray-500">Time:</span> <span className="text-gray-400 font-mono">{fmtDuration(r.duration)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Sync History */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-50 mb-4">Sync History</h2>
        {syncLogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No sync history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-gray-700">
                  <th className="text-left px-3 py-2">Entity</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Records</th>
                  <th className="text-right px-3 py-2">Duration</th>
                  <th className="text-right px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map(log => (
                  <tr key={log.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                    <td className="px-3 py-2 text-gray-300 capitalize">{log.entity_type}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{log.sync_type}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                        log.status === 'completed'
                          ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700'
                          : log.status === 'running'
                            ? 'bg-blue-900/50 text-blue-400 border-blue-700'
                            : log.status === 'failed'
                              ? 'bg-red-900/50 text-red-400 border-red-700'
                              : 'bg-gray-700 text-gray-400 border-gray-600'
                      }`}>
                        {log.status === 'running' && (
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                        )}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-400 tabular-nums text-xs">
                      {log.records_fetched != null && (
                        <span>
                          {log.records_fetched} fetched
                          {(log.records_created ?? 0) > 0 && `, ${log.records_created} new`}
                          {(log.records_updated ?? 0) > 0 && `, ${log.records_updated} upd`}
                          {(log.records_errored ?? 0) > 0 && (
                            <span className="text-red-400">, {log.records_errored} err</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-400 tabular-nums">{fmtDuration(log.duration_ms)}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{fmtDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
