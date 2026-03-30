'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LocationsSettingsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [locations, setLocations] = useState<any[]>([])
  useEffect(() => { fetch('/api/auth/locations').then(r => r.json()).then(d => setLocations(d.locations ?? [])) }, [])

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-50 mb-6">Locations</h1>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">City</th><th className="text-left px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>{locations.map(l => (
            <tr key={l.id} className="border-b border-gray-700/50">
              <td className="px-4 py-2.5 text-gray-50">{l.name}</td>
              <td className="px-4 py-2.5 text-gray-300">{l.city}, {l.state}</td>
              <td className="px-4 py-2.5">
                <Link href={`/settings/locations/${l.id}/settings`} className="text-xs text-emerald-400 hover:text-emerald-300">Settings</Link>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
