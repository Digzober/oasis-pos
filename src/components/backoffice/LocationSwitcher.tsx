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
        className="flex h-8 max-w-[220px] items-center gap-2 rounded-sm border border-edge bg-raised px-3 text-[13px] text-primary hover:bg-overlay">
        <span className="truncate">{locationName}</span>
        <span className="text-secondary text-xs shrink-0">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch('') }} />
          <div className="absolute right-0 top-full mt-1 w-72 overflow-hidden rounded-sm border border-edge-strong bg-surface shadow-lg z-50">
            <div className="p-2 border-b border-edge">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search locations..."
                className="h-8 w-full rounded-sm border border-edge bg-surface px-2 text-[13px] text-primary focus:outline-none focus:ring-2 focus:ring-ring/25" autoFocus />
            </div>
            <div className="max-h-64 overflow-y-auto">
              <button onClick={() => { setLocation(null); setOpen(false); setSearch('') }}
                className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-raised ${!locationId ? 'bg-accent-soft text-accent font-medium' : 'text-secondary'}`}>
                All Locations
              </button>
              {filtered.map(l => (
                <button key={l.id} onClick={() => { setLocation(l.id, l.name); setOpen(false); setSearch('') }}
                  className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-raised ${locationId === l.id ? 'bg-accent-soft text-accent font-medium' : 'text-secondary'}`}>
                  {l.name}
                  <span className="text-xs text-muted ml-1">— {l.city}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
