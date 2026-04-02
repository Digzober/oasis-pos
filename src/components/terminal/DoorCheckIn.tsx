'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface QueueEntry {
  id: string
  customer_name: string | null
  customer_type: string | null
  source: string
  checked_in_at: string
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  employee_id: string | null
  customers: { id: string; first_name: string; last_name: string } | null
  employees: { id: string; first_name: string; last_name: string } | null
}

const SOURCE_LABELS: Record<string, string> = {
  walk_in: 'Walk-in',
  online_pickup: 'Online Pickup',
  online_delivery: 'Delivery',
  curbside: 'Curbside',
  drive_thru: 'Drive-thru',
  phone: 'Phone',
  kiosk: 'Kiosk',
}

function getWaitMinutes(checkedInAt: string): number {
  return Math.floor((Date.now() - new Date(checkedInAt).getTime()) / 60000)
}

function formatWaitTime(minutes: number): string {
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hrs}h ${mins}m ago`
}

function getWaitColor(minutes: number): string {
  if (minutes < 5) return 'text-emerald-400'
  if (minutes <= 15) return 'text-amber-400'
  return 'text-red-400'
}

function getDisplayName(entry: QueueEntry): string {
  if (entry.customers) {
    return `${entry.customers.first_name} ${entry.customers.last_name}`.trim()
  }
  return entry.customer_name ?? 'Unknown'
}

export default function DoorCheckIn({ locationId }: { locationId: string }) {
  const [customerName, setCustomerName] = useState('')
  const [customerType, setCustomerType] = useState<'recreational' | 'medical'>('recreational')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [, setTick] = useState(0)
  const [flash, setFlash] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null)

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/terminal/queue?location_id=${locationId}`)
      const data = await res.json()
      if (res.ok) {
        setEntries(data.entries ?? [])
      }
    } catch {
      // Silently fail on background refresh
    }
  }, [locationId])

  // Live clock tick
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(iv)
  }, [])

  // Initial fetch + realtime
  useEffect(() => {
    fetchQueue()

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const channel = supabase
      .channel(`door-${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guestlist_entries',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          fetchQueue()
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [locationId, fetchQueue])

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/terminal/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          customer_name: customerName.trim(),
          customer_type: customerType,
          source: 'walk_in',
          notes: notes.trim() || undefined,
        }),
      })

      if (res.ok) {
        setCustomerName('')
        setNotes('')
        setCustomerType('recreational')
        setFlash(true)
        setTimeout(() => setFlash(false), 1500)
        await fetchQueue()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const waiting = entries.filter(e => !e.started_at && !e.completed_at && !e.cancelled_at)
  const serving = entries.filter(e => e.started_at && !e.completed_at && !e.cancelled_at)

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Check-In Form */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-50 mb-4 uppercase tracking-wide">
          Customer Check-In
        </h2>

        <form onSubmit={handleCheckIn} className="space-y-4">
          {/* Customer Name */}
          <div>
            <label htmlFor="door-name" className="block text-xs font-medium text-gray-400 mb-1.5">
              Customer Name
            </label>
            <input
              id="door-name"
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="First Last"
              required
              autoFocus
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-50 text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Customer Type Toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Customer Type
            </label>
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              <button
                type="button"
                onClick={() => setCustomerType('recreational')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  customerType === 'recreational'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-900 text-gray-400 hover:text-gray-300'
                }`}
              >
                REC
              </button>
              <button
                type="button"
                onClick={() => setCustomerType('medical')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors border-l border-gray-700 ${
                  customerType === 'medical'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-900 text-gray-400 hover:text-gray-300'
                }`}
              >
                MED
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="door-notes" className="block text-xs font-medium text-gray-400 mb-1.5">
              Notes <span className="text-gray-600">(optional)</span>
            </label>
            <input
              id="door-notes"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="VIP, first-time, needs help with..."
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-50 text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !customerName.trim()}
            className={`w-full py-3 rounded-lg text-sm font-semibold transition-all ${
              flash
                ? 'bg-emerald-500 text-white scale-[0.98]'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {submitting ? 'Checking in...' : flash ? 'Checked In!' : 'Check In'}
          </button>
        </form>
      </div>

      {/* Live Queue (Read-Only) */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${waiting.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Queue ({waiting.length} waiting{serving.length > 0 ? ` / ${serving.length} serving` : ''})
            </h3>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {waiting.length === 0 && serving.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-gray-500 text-sm">
              No customers in queue
            </div>
          ) : (
            <>
              {waiting.map((entry, index) => {
                const waitMin = getWaitMinutes(entry.checked_in_at)
                const isClaimed = !!entry.employee_id
                const type = entry.customer_type ?? 'recreational'

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      isClaimed ? 'bg-gray-900/40 opacity-60' : 'bg-gray-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-gray-500 w-5 text-right flex-shrink-0">
                        #{index + 1}
                      </span>
                      <span className="text-sm text-gray-200 truncate">{getDisplayName(entry)}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          type === 'medical'
                            ? 'bg-blue-900/50 text-blue-300'
                            : 'bg-emerald-900/50 text-emerald-300'
                        }`}
                      >
                        {type === 'medical' ? 'MED' : 'REC'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-500">
                        {SOURCE_LABELS[entry.source] ?? entry.source}
                      </span>
                      <span className={`text-xs font-mono ${getWaitColor(waitMin)}`}>
                        {formatWaitTime(waitMin)}
                      </span>
                      {isClaimed && entry.employees && (
                        <span className="text-[10px] text-gray-500 italic">
                          {entry.employees.first_name}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Serving entries */}
              {serving.map(entry => {
                const budtenderName = entry.employees
                  ? `${entry.employees.first_name}`
                  : 'Unknown'

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 bg-emerald-900/15 border border-emerald-800/20"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-sm text-gray-300 truncate">{getDisplayName(entry)}</span>
                      <span className="text-[10px] text-emerald-400/60">w/ {budtenderName}</span>
                    </div>
                    <span className="text-[10px] text-emerald-500/60">Serving</span>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
