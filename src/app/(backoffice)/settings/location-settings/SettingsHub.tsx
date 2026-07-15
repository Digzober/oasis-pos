'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  CanonicalSettingPath,
  EffectiveSettings,
  LocationSettingsOverride,
  OrganizationSettingsOverride,
} from '@/lib/settings/schema'

type Scope = 'organization' | 'location'
type SettingValue = boolean | number | string

interface HubData {
  defaults: EffectiveSettings
  effective: EffectiveSettings
  organization: OrganizationSettingsOverride
  location: LocationSettingsOverride
  locations: Array<{ id: string; name: string; city: string; state: string }>
  selected_location_id: string
}

interface Control {
  path: CanonicalSettingPath
  label: string
  description: string
  type: 'boolean' | 'number' | 'select'
  min?: number
  max?: number
  options?: Array<{ value: string; label: string }>
}

interface Section {
  title: string
  description: string
  controls: Control[]
}

const ROUNDING_OPTION_PAIRS: Array<[string, string]> = [
  ['none', 'No rounding'], ['round_up_025', 'Round up to $0.25'],
  ['round_up_050', 'Round up to $0.50'], ['round_up_100', 'Round up to $1.00'],
  ['round_down_025', 'Round down to $0.25'], ['round_down_050', 'Round down to $0.50'],
  ['round_down_100', 'Round down to $1.00'], ['round_nearest_005', 'Nearest $0.05'],
  ['round_nearest_010', 'Nearest $0.10'], ['round_nearest_025', 'Nearest $0.25'],
  ['round_nearest_050', 'Nearest $0.50'],
]
const ROUNDING_OPTIONS = ROUNDING_OPTION_PAIRS.map(([value, label]) => ({ value, label }))

const SECTIONS: Section[] = [
  { title: 'Checkout', description: 'Sale requirements and cash-total behavior.', controls: [
    { path: 'checkout.require_customer', label: 'Require customer', description: 'Require a customer before checkout can complete.', type: 'boolean' },
    { path: 'checkout.rounding_method', label: 'Cash rounding', description: 'Rounding method applied to eligible cash totals.', type: 'select', options: ROUNDING_OPTIONS },
  ] },
  { title: 'Compliance', description: 'Location-specific identity safeguards.', controls: [
    { path: 'compliance.require_id_scan', label: 'Require ID verification', description: 'Require verified identification before checkout.', type: 'boolean' },
  ] },
  { title: 'Printing', description: 'Defaults used when a register has no override.', controls: [
    { path: 'printing.auto_print_receipt_default', label: 'Auto-print receipts', description: 'Print a receipt automatically after a completed sale.', type: 'boolean' },
    { path: 'printing.auto_print_label_default', label: 'Auto-print labels', description: 'Print labels automatically in the supported label flow.', type: 'boolean' },
  ] },
  { title: 'Inventory', description: 'Default inventory reporting thresholds.', controls: [
    { path: 'inventory.low_stock_threshold', label: 'Low-stock threshold', description: 'Default quantity considered low stock.', type: 'number', min: 0, max: 1_000_000 },
  ] },
  { title: 'Online ordering', description: 'Reservation and scheduling defaults.', controls: [
    { path: 'online.reserve_inventory', label: 'Reserve inventory', description: 'Reserve inventory when an online order is accepted.', type: 'boolean' },
    { path: 'online.pickup_window_minutes', label: 'Pickup window (minutes)', description: 'Minimum pickup preparation window.', type: 'number', min: 1, max: 1440 },
    { path: 'online.max_advance_order_days', label: 'Maximum advance days', description: 'Furthest date a customer may schedule an order.', type: 'number', min: 0, max: 365 },
  ] },
]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge<T>(target: T, override: unknown): T {
  if (!isObject(target) || !isObject(override)) return override as T
  const merged: Record<string, unknown> = { ...target }
  for (const [key, value] of Object.entries(override)) {
    merged[key] = isObject(merged[key]) && isObject(value)
      ? deepMerge(merged[key], value) : value
  }
  return merged as T
}

function valueAt(settings: EffectiveSettings, path: CanonicalSettingPath): SettingValue {
  const [group, key] = splitPath(path)
  const groups = settings as unknown as Record<string, Record<string, SettingValue>>
  return groups[group]![key]!
}

function hasOverride(settings: object, path: CanonicalSettingPath): boolean {
  const [group, key] = splitPath(path)
  const namespace = (settings as Record<string, unknown>)[group]
  return isObject(namespace) && Object.hasOwn(namespace, key)
}

function makePatch(path: CanonicalSettingPath, value: SettingValue) {
  const [group, key] = splitPath(path)
  return { [group]: { [key]: value } }
}

async function fetchHubData(locationId?: string): Promise<{ data?: HubData; error?: string }> {
  const query = locationId ? `?location_id=${encodeURIComponent(locationId)}` : ''
  const response = await fetch(`/api/settings/location-settings${query}`, { cache: 'no-store' })
  const body = await response.json().catch(() => ({}))
  return response.ok
    ? { data: body as HubData }
    : { error: body.error ?? 'Failed to load settings' }
}

function splitPath(path: CanonicalSettingPath): [string, string] {
  const separator = path.indexOf('.')
  return [path.slice(0, separator), path.slice(separator + 1)]
}

function useHubData(initialLocationId?: string) {
  const [data, setData] = useState<HubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async (locationId?: string) => {
    setLoading(true)
    setError(null)
    const result = await fetchHubData(locationId)
    if (result.error) setError(result.error)
    if (result.data) setData(result.data)
    setLoading(false)
  }, [])
  useEffect(() => {
    let active = true
    void fetchHubData(initialLocationId).then((result) => {
      if (!active) return
      if (result.error) setError(result.error)
      if (result.data) setData(result.data)
      setLoading(false)
    })
    return () => { active = false }
  }, [initialLocationId])
  return { data, setData, loading, error, setError, load }
}

function useHubMutations(scope: Scope, data: HubData | null, setData: (data: HubData) => void, setError: (error: string | null) => void) {
  const [savingPath, setSavingPath] = useState<CanonicalSettingPath | null>(null)
  const mutate = useCallback(async (path: CanonicalSettingPath, value?: SettingValue) => {
    if (!data) return
    setSavingPath(path)
    setError(null)
    const response = await fetch('/api/settings/location-settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope, location_id: data.selected_location_id,
        ...(value === undefined ? { remove: path } : { patch: makePatch(path, value) }),
      }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) setError(body.error ?? 'Failed to save setting')
    else setData({ ...data, [scope]: body.settings })
    setSavingPath(null)
  }, [data, scope, setData, setError])
  return { savingPath, save: mutate, reset: (path: CanonicalSettingPath) => mutate(path) }
}

export function SettingsHub({ initialLocationId }: { initialLocationId?: string }) {
  const [scope, setScope] = useState<Scope>('location')
  const hub = useHubData(initialLocationId)
  const mutation = useHubMutations(scope, hub.data, hub.setData, hub.setError)
  const resolved = useMemo(() => {
    if (!hub.data) return null
    const organization = deepMerge(hub.data.defaults, hub.data.organization)
    return scope === 'organization' ? organization : deepMerge(organization, hub.data.location)
  }, [hub.data, scope])
  if (hub.loading) return <p className="text-sm text-muted">Loading settings…</p>
  if (!hub.data || !resolved) return <ErrorBanner message={hub.error ?? 'Settings unavailable'} />
  const data = hub.data
  return (
    <div className="space-y-6">
      <HubHeader />
      <ScopeBar data={data} scope={scope} setScope={setScope} load={hub.load} />
      {hub.error && <ErrorBanner message={hub.error} />}
      <div className="space-y-4">
        {SECTIONS.map((section) => <SettingsSection key={section.title} section={section} scope={scope}
          resolved={resolved} overrides={scope === 'organization' ? data.organization : data.location}
          savingPath={mutation.savingPath} save={mutation.save} reset={mutation.reset} />)}
      </div>
    </div>
  )
}

function HubHeader() {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Settings hub</p>
    <h1 className="mt-1 text-2xl font-bold text-primary">Organization defaults and location overrides</h1>
    <p className="mt-2 max-w-3xl text-sm text-secondary">Set a shared default once, then override only the controls that differ at a licensed location.</p></div>
}

function ScopeBar({ data, scope, setScope, load }: { data: HubData; scope: Scope; setScope: (scope: Scope) => void; load: (id?: string) => Promise<void> }) {
  const changeLocation = (id: string) => {
    window.history.replaceState(null, '', `/settings/location-settings?location_id=${id}`)
    void load(id)
  }
  return <div className="rounded-xl border border-edge bg-surface p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">Editing scope</label>
      <div className="inline-flex rounded-lg border border-edge-strong bg-bg p-1">
        <ScopeButton active={scope === 'organization'} label="Organization defaults" onClick={() => setScope('organization')} />
        <ScopeButton active={scope === 'location'} label="Location override" onClick={() => setScope('location')} />
      </div></div>
    <div className="min-w-72"><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-secondary">Location</label>
      <select value={data.selected_location_id} onChange={(event) => changeLocation(event.target.value)}
        className="h-10 w-full rounded-lg border border-edge-strong bg-bg px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30">
        {data.locations.map((location) => <option key={location.id} value={location.id}>{location.name} — {location.city}, {location.state}</option>)}
      </select></div>
  </div></div>
}

function ScopeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${active ? 'bg-accent text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}>{label}</button>
}

function SettingsSection(props: { section: Section; scope: Scope; resolved: EffectiveSettings; overrides: object; savingPath: CanonicalSettingPath | null; save: (path: CanonicalSettingPath, value: SettingValue) => Promise<void>; reset: (path: CanonicalSettingPath) => Promise<void> }) {
  const { section, ...rowProps } = props
  return <section className="overflow-hidden rounded-xl border border-edge bg-surface">
    <div className="border-b border-edge px-5 py-4"><h2 className="text-base font-semibold text-primary">{section.title}</h2><p className="mt-1 text-sm text-secondary">{section.description}</p></div>
    <div className="divide-y divide-edge">{section.controls.map((control) => <SettingRow key={control.path} control={control} {...rowProps} />)}</div>
  </section>
}

function SettingRow({ control, scope, resolved, overrides, savingPath, save, reset }: { control: Control; scope: Scope; resolved: EffectiveSettings; overrides: object; savingPath: CanonicalSettingPath | null; save: (path: CanonicalSettingPath, value: SettingValue) => Promise<void>; reset: (path: CanonicalSettingPath) => Promise<void> }) {
  const value = valueAt(resolved, control.path)
  const overridden = hasOverride(overrides, control.path)
  const status = overridden ? (scope === 'organization' ? 'Organization default' : 'Location override') : (scope === 'organization' ? 'Code default' : 'Inherits organization')
  return <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
    <div className="max-w-xl"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-medium text-primary">{control.label}</h3>
      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${overridden ? 'border-accent/50 bg-accent/10 text-accent' : 'border-edge-strong bg-bg text-muted'}`}>{status}</span></div>
      <p className="mt-1 text-xs text-secondary">{control.description}</p></div>
    <div className="flex items-center gap-3 md:pl-6"><ControlInput control={control} value={value} disabled={savingPath === control.path} save={save} />
      <button type="button" disabled={!overridden || savingPath === control.path} onClick={() => void reset(control.path)}
        className="min-w-14 text-xs font-medium text-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30">Inherit</button></div>
  </div>
}

function ControlInput({ control, value, disabled, save }: { control: Control; value: SettingValue; disabled: boolean; save: (path: CanonicalSettingPath, value: SettingValue) => Promise<void> }) {
  if (control.type === 'boolean') return <button type="button" role="switch" aria-checked={Boolean(value)} disabled={disabled}
    onClick={() => void save(control.path, !value)} className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${value ? 'bg-accent' : 'bg-raised'}`}>
    <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} /></button>
  if (control.type === 'select') return <select value={String(value)} disabled={disabled} onChange={(event) => void save(control.path, event.target.value)}
    className="h-9 min-w-52 rounded-lg border border-edge-strong bg-bg px-3 text-sm text-primary focus:border-accent focus:outline-none">
    {control.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
  return <input key={`${control.path}-${value}`} type="number" defaultValue={Number(value)} min={control.min} max={control.max} disabled={disabled}
    onBlur={(event) => { const next = Number(event.target.value); if (Number.isFinite(next) && next !== value) void save(control.path, next) }}
    className="h-9 w-28 rounded-lg border border-edge-strong bg-bg px-3 text-right text-sm text-primary focus:border-accent focus:outline-none" />
}

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{message}</div>
}
