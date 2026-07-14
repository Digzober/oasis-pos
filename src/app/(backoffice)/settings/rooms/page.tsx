'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyR = any

export default function RoomsPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [rooms, setRooms] = useState<AnyR[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchRooms = useCallback(() => { fetch(`/api/rooms${locationId ? `?location_id=${locationId}` : ''}`).then(r => r.json()).then(d => { setRooms(d.rooms ?? []); setLoading(false) }) }, [locationId])
  useEffect(() => { if (hydrated) fetchRooms() }, [hydrated, fetchRooms])

  const addRoom = async () => {
    if (!newName.trim()) return
    await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) })
    setNewName(''); fetchRooms()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-primary mb-6">Rooms & Subrooms</h1>
      <div className="flex gap-2 mb-4">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New room name..."
          className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary w-64" />
        <button onClick={addRoom} className="px-3 py-1.5 bg-accent text-primary rounded-lg text-sm hover:bg-accent">Add Room</button>
      </div>
      <div className="bg-surface rounded-xl border border-edge p-4 space-y-3">
        {loading ? <p className="text-muted text-sm">Loading...</p> : rooms.map((r: AnyR) => (
          <div key={r.id} className="border-b border-edge/50 pb-2">
            <p className="text-primary font-medium">{r.name}</p>
            <p className="text-xs text-secondary">{(r.room_types ?? []).join(', ')}</p>
            {(r.subrooms ?? []).map((s: AnyR) => (
              <p key={s.id} className="text-sm text-secondary ml-4">└ {s.name}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
