'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

interface DeliveryZone { id: string; name: string; delivery_fee: number; min_order: number | null }
interface Vehicle { id: string; name: string; license_plate: string }
interface Driver { id: string; employees?: { first_name: string; last_name: string } | null }
interface DeliveryConfig { max_total_value: number | null; max_total_weight_grams: number | null }

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Request failed')
  return payload
}

function fmt(n: number) { return `$${n.toFixed(2)}` }

export default function DeliverySettingsPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [error, setError] = useState('')
  const [configForm, setConfigForm] = useState({ max_total_value: '', max_total_weight_grams: '' })
  const [newZone, setNewZone] = useState({ name: '', delivery_fee: '', min_order: '' })
  const [showZoneForm, setShowZoneForm] = useState(false)

  const fetchAll = useCallback(() => {
    const q = locationId ? `?location_id=${locationId}` : ''
    return Promise.all([
      fetchJson<{ zones: DeliveryZone[] }>('/api/delivery/zones'),
      fetchJson<{ vehicles: Vehicle[] }>(`/api/delivery/vehicles${q}`),
      fetchJson<{ drivers: Driver[] }>(`/api/delivery/drivers${q}`),
      fetchJson<{ config: DeliveryConfig | null }>('/api/delivery/config'),
    ]).then(([zoneData, vehicleData, driverData, configData]) => {
      setZones(zoneData.zones); setVehicles(vehicleData.vehicles); setDrivers(driverData.drivers)
      if (configData.config) setConfigForm({ max_total_value: String(configData.config.max_total_value ?? ''), max_total_weight_grams: String(configData.config.max_total_weight_grams ?? '') })
      setError('')
    }).catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : 'Unable to load delivery settings') })
  }, [locationId])
  useEffect(() => {
    if (!hydrated) return
    void fetchAll()
  }, [hydrated, fetchAll])

  const saveConfig = async () => {
    try {
      await fetchJson('/api/delivery/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_total_value: parseFloat(configForm.max_total_value) || null, max_total_weight_grams: parseFloat(configForm.max_total_weight_grams) || null }) })
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save delivery configuration') }
  }

  const saveZone = async () => {
    try {
      await fetchJson('/api/delivery/zones', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newZone.name, delivery_fee: parseFloat(newZone.delivery_fee) || 0, min_order: parseFloat(newZone.min_order) || 0 }) })
      setShowZoneForm(false); setNewZone({ name: '', delivery_fee: '', min_order: '' })
      const data = await fetchJson<{ zones: DeliveryZone[] }>('/api/delivery/zones')
      setZones(data.zones); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save delivery zone') }
  }

  const inputCls = "h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm"

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-primary">Delivery Settings</h1>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {/* Config */}
      <div className="bg-surface rounded-xl border border-edge p-4 space-y-3">
        <h3 className="text-sm font-semibold text-secondary uppercase">Organization Configuration</h3>
        <p className="text-xs text-muted">These limits and delivery zones apply to every location in the organization.</p>
        <div className="grid grid-cols-2 gap-4">
          <label className="block"><span className="text-xs text-secondary">Max Delivery Value ($)</span>
            <input value={configForm.max_total_value} onChange={e => setConfigForm(p => ({ ...p, max_total_value: e.target.value }))} className={inputCls + ' w-full'} /></label>
          <label className="block"><span className="text-xs text-secondary">Max Weight (g)</span>
            <input value={configForm.max_total_weight_grams} onChange={e => setConfigForm(p => ({ ...p, max_total_weight_grams: e.target.value }))} className={inputCls + ' w-full'} /></label>
        </div>
        <button onClick={saveConfig} className="px-3 py-1.5 bg-accent text-primary rounded-lg text-sm">Save Config</button>
      </div>

      {/* Zones */}
      <div className="bg-surface rounded-xl border border-edge p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-secondary uppercase">Delivery Zones</h3>
          <button onClick={() => setShowZoneForm(true)} className="text-xs px-2 py-1 bg-accent text-primary rounded">+ Zone</button>
        </div>
        {showZoneForm && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            <input value={newZone.name} onChange={e => setNewZone(p => ({ ...p, name: e.target.value }))} placeholder="Zone name" className={inputCls} />
            <input value={newZone.delivery_fee} onChange={e => setNewZone(p => ({ ...p, delivery_fee: e.target.value }))} placeholder="Fee" className={inputCls} />
            <input value={newZone.min_order} onChange={e => setNewZone(p => ({ ...p, min_order: e.target.value }))} placeholder="Min order" className={inputCls} />
            <button onClick={saveZone} className="px-3 bg-accent text-primary rounded-lg text-sm">Save</button>
          </div>
        )}
        <table className="w-full text-sm">
          <thead><tr className="border-b border-edge text-secondary text-xs uppercase">
            <th className="text-left py-2">Name</th><th className="text-right py-2">Fee</th><th className="text-right py-2">Minimum</th>
          </tr></thead>
          <tbody>{zones.map((z) => (
            <tr key={z.id} className="border-b border-edge/50">
              <td className="py-2 text-primary">{z.name}</td>
              <td className="py-2 text-right text-secondary tabular-nums">{fmt(z.delivery_fee ?? 0)}</td>
              <td className="py-2 text-right text-secondary tabular-nums">{fmt(z.min_order ?? 0)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* Vehicles & Drivers */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-edge p-4">
          <h3 className="text-sm font-semibold text-secondary uppercase mb-3">Vehicles ({vehicles.length})</h3>
          {vehicles.map((v) => <div key={v.id} className="text-sm text-primary py-1">{v.name} — {v.license_plate}</div>)}
          {vehicles.length === 0 && <p className="text-muted text-xs">No vehicles configured</p>}
        </div>
        <div className="bg-surface rounded-xl border border-edge p-4">
          <h3 className="text-sm font-semibold text-secondary uppercase mb-3">Drivers ({drivers.length})</h3>
          {drivers.map((d) => <div key={d.id} className="text-sm text-primary py-1">{d.employees?.first_name} {d.employees?.last_name}</div>)}
          {drivers.length === 0 && <p className="text-muted text-xs">No drivers configured</p>}
        </div>
      </div>
    </div>
  )
}
