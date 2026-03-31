'use client'

import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyR = any

function fmt(n: number) { return `$${n.toFixed(2)}` }

export default function DeliverySettingsPage() {
  const [zones, setZones] = useState<AnyR[]>([])
  const [vehicles, setVehicles] = useState<AnyR[]>([])
  const [drivers, setDrivers] = useState<AnyR[]>([])
  const [config, setConfig] = useState<AnyR>(null)
  const [configForm, setConfigForm] = useState({ max_delivery_value: '', max_delivery_weight: '' })
  const [newZone, setNewZone] = useState({ name: '', delivery_fee: '', min_order: '', estimated_delivery_minutes: '' })
  const [showZoneForm, setShowZoneForm] = useState(false)

  useEffect(() => {
    fetch('/api/delivery/zones').then(r => r.json()).then(d => setZones(d.zones ?? []))
    fetch('/api/delivery/vehicles').then(r => r.json()).then(d => setVehicles(d.vehicles ?? []))
    fetch('/api/delivery/drivers').then(r => r.json()).then(d => setDrivers(d.drivers ?? []))
    fetch('/api/delivery/config').then(r => r.json()).then(d => {
      setConfig(d.config)
      if (d.config) setConfigForm({ max_delivery_value: String(d.config.max_delivery_value ?? ''), max_delivery_weight: String(d.config.max_delivery_weight ?? '') })
    })
  }, [])

  const saveConfig = async () => {
    await fetch('/api/delivery/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_delivery_value: parseFloat(configForm.max_delivery_value) || null, max_delivery_weight: parseFloat(configForm.max_delivery_weight) || null, is_active: true }) })
  }

  const saveZone = async () => {
    await fetch('/api/delivery/zones', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newZone.name, delivery_fee: parseFloat(newZone.delivery_fee) || 0, min_order: parseFloat(newZone.min_order) || 0, estimated_delivery_minutes: parseInt(newZone.estimated_delivery_minutes) || 45 }) })
    setShowZoneForm(false); setNewZone({ name: '', delivery_fee: '', min_order: '', estimated_delivery_minutes: '' })
    fetch('/api/delivery/zones').then(r => r.json()).then(d => setZones(d.zones ?? []))
  }

  const inputCls = "h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm"

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-50">Delivery Settings</h1>

      {/* Config */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase">Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="block"><span className="text-xs text-gray-400">Max Delivery Value ($)</span>
            <input value={configForm.max_delivery_value} onChange={e => setConfigForm(p => ({ ...p, max_delivery_value: e.target.value }))} className={inputCls + ' w-full'} /></label>
          <label className="block"><span className="text-xs text-gray-400">Max Weight (g)</span>
            <input value={configForm.max_delivery_weight} onChange={e => setConfigForm(p => ({ ...p, max_delivery_weight: e.target.value }))} className={inputCls + ' w-full'} /></label>
        </div>
        <button onClick={saveConfig} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm">Save Config</button>
      </div>

      {/* Zones */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase">Delivery Zones</h3>
          <button onClick={() => setShowZoneForm(true)} className="text-xs px-2 py-1 bg-emerald-600 text-white rounded">+ Zone</button>
        </div>
        {showZoneForm && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            <input value={newZone.name} onChange={e => setNewZone(p => ({ ...p, name: e.target.value }))} placeholder="Zone name" className={inputCls} />
            <input value={newZone.delivery_fee} onChange={e => setNewZone(p => ({ ...p, delivery_fee: e.target.value }))} placeholder="Fee" className={inputCls} />
            <input value={newZone.min_order} onChange={e => setNewZone(p => ({ ...p, min_order: e.target.value }))} placeholder="Min order" className={inputCls} />
            <button onClick={saveZone} className="px-3 bg-emerald-600 text-white rounded-lg text-sm">Save</button>
          </div>
        )}
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left py-2">Name</th><th className="text-right py-2">Fee</th><th className="text-right py-2">Minimum</th><th className="text-right py-2">Est. Minutes</th>
          </tr></thead>
          <tbody>{zones.map((z: AnyR) => (
            <tr key={z.id} className="border-b border-gray-700/50">
              <td className="py-2 text-gray-50">{z.name}</td>
              <td className="py-2 text-right text-gray-300 tabular-nums">{fmt(z.delivery_fee ?? 0)}</td>
              <td className="py-2 text-right text-gray-300 tabular-nums">{fmt(z.min_order ?? 0)}</td>
              <td className="py-2 text-right text-gray-400">{z.estimated_delivery_minutes ?? 45} min</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* Vehicles & Drivers */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">Vehicles ({vehicles.length})</h3>
          {vehicles.map((v: AnyR) => <div key={v.id} className="text-sm text-gray-50 py-1">{v.name} — {v.license_plate}</div>)}
          {vehicles.length === 0 && <p className="text-gray-500 text-xs">No vehicles configured</p>}
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">Drivers ({drivers.length})</h3>
          {drivers.map((d: AnyR) => <div key={d.id} className="text-sm text-gray-50 py-1">{d.employees?.first_name} {d.employees?.last_name}</div>)}
          {drivers.length === 0 && <p className="text-gray-500 text-xs">No drivers configured</p>}
        </div>
      </div>
    </div>
  )
}
