'use client'

import { useState, useEffect } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

interface LocationOption {
  id: string
  name: string
  city: string
  state: string
}

export default function LocationSwitcher() {
  const { locationId, locationName, setLocation } = useSelectedLocation()
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/auth/locations').then(r => r.json()).then(d => setLocations(d.locations ?? []))
  }, [])

  const filtered = search ? locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase())) : locations

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg text-sm text-gray-200 hover:bg-gray-600 max-w-[220px]">
        <span className="truncate">{locationName}</span>
        <span className="text-gray-400 text-xs shrink-0">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch('') }} />
          <div className="absolute right-0 top-full mt-1 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-gray-700">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search locations..."
                className="w-full h-8 px-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-50 focus:outline-none" autoFocus />
            </div>
            <div className="max-h-64 overflow-y-auto">
              <button onClick={() => { setLocation(null); setOpen(false); setSearch('') }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 ${!locationId ? 'text-emerald-400 font-medium' : 'text-gray-300'}`}>
                All Locations
              </button>
              {filtered.map(l => (
                <button key={l.id} onClick={() => { setLocation(l.id, l.name); setOpen(false); setSearch('') }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 ${locationId === l.id ? 'text-emerald-400 font-medium' : 'text-gray-300'}`}>
                  {l.name}
                  <span className="text-xs text-gray-500 ml-1">— {l.city}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
