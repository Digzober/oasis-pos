'use client'
import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type E = any

export default function StorefrontEventsPage() {
  const [events, setEvents] = useState<E[]>([])
  useEffect(() => { fetch('/api/events?status=upcoming').then(r => r.json()).then(d => setEvents(d.events ?? [])).catch(() => {}) }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Upcoming Events</h1>
      {events.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No upcoming events</p>
      ) : (
        <div className="space-y-4">
          {events.map((e: E) => (
            <div key={e.id} className="border rounded-xl p-4">
              <h3 className="font-bold text-lg">{e.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {e.start_date ? new Date(e.start_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                {e.end_date && e.start_date !== e.end_date ? ` — ${new Date(e.end_date).toLocaleDateString()}` : ''}
              </p>
              {e.description && <p className="text-sm text-gray-600 mt-2">{e.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
