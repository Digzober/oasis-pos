'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

const inputCls = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'

interface DutchieConfig {
  isEnabled: boolean
  apiKey: string
  hasApiKey: boolean
  apiKeyTail: string
  dutchieLocationId: string
  dutchieLocationName: string
  syncEmployees: boolean
  syncCustomers: boolean
  syncProducts: boolean
  syncInventory: boolean
  syncRooms: boolean
  syncTransactions: boolean
  syncLoyalty: boolean
  lastSyncedEmployeesAt: string | null
  lastSyncedCustomersAt: string | null
  lastSyncedProductsAt: string | null
  lastSyncedInventoryAt: string | null
  lastSyncedRoomsAt: string | null
  lastSyncedReferenceAt: string | null
  lastSyncedTransactionsAt: string | null
  lastSyncedLoyaltyAt: string | null
  designatedLoyaltyLocationId: string | null
}

interface AvailableLocation { id: string; name: string }

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
}

const DEFAULT_CONFIG: DutchieConfig = {
  isEnabled: false,
  apiKey: '',
  hasApiKey: false,
  apiKeyTail: '',
  dutchieLocationId: '',
  dutchieLocationName: '',
  syncEmployees: true,
  syncCustomers: true,
  syncProducts: true,
  syncInventory: true,
  syncRooms: true,
  syncTransactions: true,
  syncLoyalty: true,
  lastSyncedEmployeesAt: null,
  lastSyncedCustomersAt: null,
  lastSyncedProductsAt: null,
  lastSyncedInventoryAt: null,
  lastSyncedRoomsAt: null,
  lastSyncedReferenceAt: null,
  lastSyncedTransactionsAt: null,
  lastSyncedLoyaltyAt: null,
  designatedLoyaltyLocationId: null,
}

const ENTITY_TYPES = [
  { key: 'employees' as const, label: 'Employees', configKey: 'syncEmployees' as const, tsKey: 'lastSyncedEmployeesAt' as const },
  { key: 'customers' as const, label: 'Customers', configKey: 'syncCustomers' as const, tsKey: 'lastSyncedCustomersAt' as const },
  { key: 'products' as const, label: 'Products', configKey: 'syncProducts' as const, tsKey: 'lastSyncedProductsAt' as const },
  { key: 'inventory' as const, label: 'Inventory', configKey: 'syncInventory' as const, tsKey: 'lastSyncedInventoryAt' as const },
  { key: 'rooms' as const, label: 'Rooms', configKey: 'syncRooms' as const, tsKey: 'lastSyncedRoomsAt' as const },
  { key: 'transactions' as const, label: 'Transactions', configKey: 'syncTransactions' as const, tsKey: 'lastSyncedTransactionsAt' as const },
  { key: 'loyalty' as const, label: 'Loyalty', configKey: 'syncLoyalty' as const, tsKey: 'lastSyncedLoyaltyAt' as const },
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
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('en-US', {
    timeZone: 'America/Denver',
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZoneName: 'short',
  })
}

export default function DutchieSettingsPage() {
  const [config, setConfig] = useState<DutchieConfig>(DEFAULT_CONFIG)
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [availableLocations, setAvailableLocations] = useState<AvailableLocation[]>([])
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
          setAvailableLocations(Array.isArray(d.availableLocations) ? d.availableLocations : [])
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
    void Promise.resolve().then(() => Promise.all([loadConfig(), loadLogs()]))
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
          ...(config.apiKey.trim() ? { apiKey: config.apiKey.trim() } : {}),
          syncEmployees: config.syncEmployees,
          syncCustomers: config.syncCustomers,
          syncProducts: config.syncProducts,
          syncInventory: config.syncInventory,
          syncRooms: config.syncRooms,
          syncTransactions: config.syncTransactions,
          syncLoyalty: config.syncLoyalty,
          designatedLoyaltyLocationId: config.designatedLoyaltyLocationId,
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
      setSyncingEntity(entityTypes[0] ?? null)
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
    ? 'bg-accent'
    : connectionStatus === 'failed'
      ? 'bg-danger'
      : 'bg-overlay'

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-primary">Dutchie Integration</h1>
        <div className={`w-2.5 h-2.5 rounded-full ${statusDot}`} />
        {connectionInfo && (
          <span className="text-sm text-secondary">{connectionInfo}</span>
        )}
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
          msg.type === 'ok'
            ? 'bg-accent/50 text-accent border border-accent'
            : 'bg-danger/50 text-danger border border-danger'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Section 1: Connection */}
      <div className="bg-surface rounded-xl border border-edge p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Connection</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.apiKey ?? ''}
                onChange={e => updateField('apiKey', e.target.value)}
                placeholder={config.hasApiKey ? config.apiKeyTail : 'Enter Dutchie API key'}
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary hover:text-primary transition-colors"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={testing || (!config.hasApiKey && !config.apiKey)}
              className="px-4 py-2 text-sm bg-raised border border-edge-strong text-primary rounded-lg hover:bg-raised transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {testing && <span className="w-3.5 h-3.5 border-2 border-edge-strong/30 border-t-gray-200 rounded-full animate-spin" />}
              Test Connection
            </button>
            {connectionStatus === 'connected' && connectionInfo && (
              <span className="text-sm text-accent flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {connectionInfo}
              </span>
            )}
            {connectionStatus === 'failed' && (
              <span className="text-sm text-danger flex items-center gap-1.5">
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
      <div className="bg-surface rounded-xl border border-edge p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Sync Settings</h2>
        <div className="space-y-3">
          {ENTITY_TYPES.map(et => (
            <div key={et.key} className="flex items-center justify-between py-2 border-b border-edge/50 last:border-0">
              <div className="flex-1">
                <span className="text-sm font-medium text-primary">{et.label}</span>
                <p className="text-xs text-muted mt-0.5">
                  Last synced: {relativeTime(config[et.tsKey])}
                </p>
                {et.key === 'loyalty' && (
                  <select
                    value={config.designatedLoyaltyLocationId ?? ''}
                    onChange={event => updateField('designatedLoyaltyLocationId', event.target.value || null)}
                    className="mt-2 h-8 px-2 bg-bg border border-edge-strong rounded text-xs text-primary"
                    aria-label="Designated loyalty sync location"
                  >
                    <option value="">Use first enabled location</option>
                    {availableLocations.map(location => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <button
                onClick={() => updateField(et.configKey, !config[et.configKey])}
                className={`w-11 h-6 rounded-full transition-colors shrink-0 ${
                  config[et.configKey] ? 'bg-accent' : 'bg-raised'
                }`}
              >
                <div className={`w-4 h-4 bg-surface rounded-full mx-1 transition-transform ${
                  config[et.configKey] ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-edge">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2 text-sm bg-accent text-primary rounded-lg hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-edge/30 border-t-white rounded-full animate-spin" />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Section 3: Actions */}
      <div className="bg-surface rounded-xl border border-edge p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Actions</h2>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => runSync()}
            disabled={syncing}
            className="px-5 py-2 text-sm bg-accent text-primary rounded-lg hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {syncing && syncingEntity === 'all' && (
              <span className="w-3.5 h-3.5 border-2 border-edge/30 border-t-white rounded-full animate-spin" />
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
              className="px-3 py-2 text-sm bg-raised border border-edge-strong text-primary rounded-lg hover:bg-raised transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncing && syncingEntity === et.key && (
                <span className="w-3 h-3 border-2 border-edge-strong/30 border-t-gray-200 rounded-full animate-spin" />
              )}
              Sync {et.label}
            </button>
          ))}
        </div>

        {/* Sync Results */}
        {syncResults && syncResults.length > 0 && (
          <div className="mt-4 bg-bg border border-edge rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-primary">Sync Results</h3>
              <button
                onClick={() => setSyncResults(null)}
                className="text-xs text-muted hover:text-secondary"
              >
                Dismiss
              </button>
            </div>
            <div className="space-y-2">
              {syncResults.map(r => (
                <div key={r.entityType} className="flex items-center gap-4 text-sm">
                  <span className="text-primary font-medium min-w-[100px] capitalize">{r.entityType}</span>
                  <div className="flex gap-4 text-xs">
                    <div><span className="text-muted">Fetched:</span> <span className="text-primary font-mono">{r.fetched}</span></div>
                    <div><span className="text-muted">Created:</span> <span className="text-accent font-mono">{r.created}</span></div>
                    <div><span className="text-muted">Updated:</span> <span className="text-info font-mono">{r.updated}</span></div>
                    <div><span className="text-muted">Skipped:</span> <span className="text-secondary font-mono">{r.skipped}</span></div>
                    {r.errors > 0 && (
                      <div><span className="text-muted">Errors:</span> <span className="text-danger font-mono">{r.errors}</span></div>
                    )}
                    <div><span className="text-muted">Time:</span> <span className="text-secondary font-mono">{fmtDuration(r.duration)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Sync History */}
      <div className="bg-surface rounded-xl border border-edge p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Sync History</h2>
        {syncLogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted">No sync history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs uppercase border-b border-edge">
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
                  <tr key={log.id} className="border-b border-edge/30 hover:bg-raised/20">
                    <td className="px-3 py-2 text-secondary capitalize">{log.entity_type}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-raised text-secondary">{log.sync_type}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                        log.status === 'completed'
                          ? 'bg-accent/50 text-accent border-accent'
                          : log.status === 'running'
                            ? 'bg-info/50 text-info border-info'
                            : log.status === 'failed'
                              ? 'bg-danger/50 text-danger border-danger'
                              : 'bg-raised text-secondary border-edge-strong'
                      }`}>
                        {log.status === 'running' && (
                          <span className="w-1.5 h-1.5 bg-info rounded-full animate-pulse" />
                        )}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-secondary tabular-nums text-xs">
                      {log.records_fetched != null && (
                        <span>
                          {log.records_fetched} fetched
                          {(log.records_created ?? 0) > 0 && `, ${log.records_created} new`}
                          {(log.records_updated ?? 0) > 0 && `, ${log.records_updated} upd`}
                          {(log.records_errored ?? 0) > 0 && (
                            <span className="text-danger">, {log.records_errored} err</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-secondary tabular-nums">{fmtDuration(log.duration_ms)}</td>
                    <td className="px-3 py-2 text-right text-secondary">{fmtDate(log.started_at)}</td>
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
