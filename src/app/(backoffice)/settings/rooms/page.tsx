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
      <h1 className="text-xl font-bold text-gray-50 mb-6">Rooms & Subrooms</h1>
      <div className="flex gap-2 mb-4">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New room name..."
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 w-64" />
        <button onClick={addRoom} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500">Add Room</button>
      </div>
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        {loading ? <p className="text-gray-500 text-sm">Loading...</p> : rooms.map((r: AnyR) => (
          <div key={r.id} className="border-b border-gray-700/50 pb-2">
            <p className="text-gray-50 font-medium">{r.name}</p>
            <p className="text-xs text-gray-400">{(r.room_types ?? []).join(', ')}</p>
            {(r.subrooms ?? []).map((s: AnyR) => (
              <p key={s.id} className="text-sm text-gray-300 ml-4">└ {s.name}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
