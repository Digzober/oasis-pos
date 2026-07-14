'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Zone = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Vehicle = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Driver = any

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

export default function DeliveryPage() {
  const { locationId } = useSelectedLocation()
  const [tab, setTab] = useState<'zones' | 'vehicles' | 'drivers'>('zones')
  const [zones, setZones] = useState<Zone[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void Promise.resolve().then(async () => {
      setLoading(true)
      const params = locationId ? `?location_id=${locationId}` : ''
      await Promise.all([
        fetch(`/api/delivery/zones${params}`).then(r => r.json()).then(d => setZones(d.zones ?? [])),
        fetch(`/api/delivery/vehicles${params}`).then(r => r.json()).then(d => setVehicles(d.vehicles ?? [])),
        fetch('/api/delivery/drivers').then(r => r.json()).then(d => setDrivers(d.drivers ?? [])),
      ])
      setLoading(false)
    })
  }, [locationId])

  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-surface text-accent border-b-2 border-accent' : 'text-secondary hover:text-primary'}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Delivery Management</h1>
        <Link href="/settings/delivery" className="text-sm px-3 py-1.5 bg-raised text-secondary rounded-lg hover:bg-raised">Delivery Settings</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-edge">
        <button onClick={() => setTab('zones')} className={tabCls('zones')}>Zones ({zones.length})</button>
        <button onClick={() => setTab('vehicles')} className={tabCls('vehicles')}>Vehicles ({vehicles.length})</button>
        <button onClick={() => setTab('drivers')} className={tabCls('drivers')}>Drivers ({drivers.length})</button>
      </div>

      {loading ? <p className="text-muted text-center py-8">Loading...</p> : (
        <div className="bg-surface rounded-xl border border-edge overflow-hidden">
          {tab === 'zones' && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-edge text-secondary text-xs uppercase">
                <th className="text-left px-4 py-3">Zone Name</th>
                <th className="text-right px-4 py-3">Fee</th>
                <th className="text-right px-4 py-3">Minimum</th>
                <th className="text-center px-4 py-3">Active</th>
              </tr></thead>
              <tbody>
                {zones.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-muted">No delivery zones configured</td></tr>
                : zones.map((z: Zone) => (
                  <tr key={z.id} className="border-b border-edge/50">
                    <td className="px-4 py-2.5 text-primary">{z.name}</td>
                    <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{fmt(z.delivery_fee ?? 0)}</td>
                    <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{fmt(z.minimum_order ?? 0)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${z.is_active ? 'bg-accent/50 text-accent' : 'bg-raised text-secondary'}`}>
                        {z.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'vehicles' && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-edge text-secondary text-xs uppercase">
                <th className="text-left px-4 py-3">Vehicle</th>
                <th className="text-left px-4 py-3">License Plate</th>
                <th className="text-center px-4 py-3">Active</th>
              </tr></thead>
              <tbody>
                {vehicles.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-muted">No vehicles configured</td></tr>
                : vehicles.map((v: Vehicle) => (
                  <tr key={v.id} className="border-b border-edge/50">
                    <td className="px-4 py-2.5 text-primary">{v.make} {v.model} {v.year}</td>
                    <td className="px-4 py-2.5 text-secondary">{v.license_plate ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${v.is_active ? 'bg-accent/50 text-accent' : 'bg-raised text-secondary'}`}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'drivers' && (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-edge text-secondary text-xs uppercase">
                <th className="text-left px-4 py-3">Driver</th>
                <th className="text-left px-4 py-3">License #</th>
                <th className="text-center px-4 py-3">Active</th>
              </tr></thead>
              <tbody>
                {drivers.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-muted">No drivers configured</td></tr>
                : drivers.map((d: Driver) => (
                  <tr key={d.id} className="border-b border-edge/50">
                    <td className="px-4 py-2.5 text-primary">{d.first_name} {d.last_name}</td>
                    <td className="px-4 py-2.5 text-secondary">{d.license_number ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.is_active ? 'bg-accent/50 text-accent' : 'bg-raised text-secondary'}`}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
