'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface QueueEntry {
  id: string
  customer_name: string | null
  customer_type: string | null
  source: string
  notes: string | null
  party_size: number
  position: number
  checked_in_at: string
  called_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  employee_id: string | null
  customers: { id: string; first_name: string; last_name: string; customer_type: string } | null
  guestlist_statuses: { id: string; name: string; color: string } | null
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
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${minutes}m`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hrs}h ${mins}m`
}

function getWaitColor(minutes: number): string {
  if (minutes < 5) return 'text-emerald-400'
  if (minutes <= 15) return 'text-amber-400'
  return 'text-red-400'
}

function getWaitBorderColor(minutes: number): string {
  if (minutes < 5) return 'border-l-emerald-500'
  if (minutes <= 15) return 'border-l-amber-500'
  return 'border-l-red-500'
}

function getDisplayName(entry: QueueEntry): string {
  if (entry.customers) {
    return `${entry.customers.first_name} ${entry.customers.last_name}`.trim()
  }
  return entry.customer_name ?? 'Unknown'
}

function getCustomerType(entry: QueueEntry): string {
  return entry.customer_type ?? entry.customers?.customer_type ?? 'recreational'
}

export default function CustomerQueue({
  locationId,
  employeeId,
  employeeName,
}: {
  locationId: string
  employeeId: string
  employeeName: string
}) {
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [showServing, setShowServing] = useState(false)
  const [, setTick] = useState(0)
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null)

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/terminal/queue?location_id=${locationId}`)
      const data = await res.json()
      if (res.ok) {
        setEntries(data.entries ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [locationId])

  // Live clock tick every 30s for wait times
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(iv)
  }, [])

  // Initial fetch + realtime subscription
  useEffect(() => {
    fetchQueue()

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const channel = supabase
      .channel(`queue-${locationId}`)
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

  const claimEntry = async (entryId: string) => {
    setClaimingId(entryId)
    try {
      await fetch('/api/terminal/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId, claimed_by_employee_id: employeeId }),
      })
      await fetchQueue()
    } finally {
      setClaimingId(null)
    }
  }

  const markServing = async (entryId: string) => {
    setClaimingId(entryId)
    try {
      await fetch('/api/terminal/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId, claimed_by_employee_id: employeeId, status: 'serving' }),
      })
      await fetchQueue()
    } finally {
      setClaimingId(null)
    }
  }

  const completeEntry = async (entryId: string) => {
    await fetch('/api/terminal/queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId, status: 'completed' }),
    })
    await fetchQueue()
  }

  const removeEntry = async (entryId: string) => {
    await fetch(`/api/terminal/queue?id=${entryId}`, { method: 'DELETE' })
    await fetchQueue()
  }

  // Split entries into waiting (unclaimed + claimed but not serving) and serving
  const waiting = entries.filter(e => !e.started_at)
  const serving = entries.filter(e => e.started_at && !e.completed_at)
  const oldestUnclaimed = waiting.find(e => !e.employee_id)

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-gray-500 animate-pulse" />
          <span className="text-sm text-gray-400">Loading queue...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${waiting.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
          <h3 className="text-sm font-semibold text-gray-50 uppercase tracking-wide">
            {waiting.length} customer{waiting.length !== 1 ? 's' : ''} waiting
          </h3>
        </div>
        {oldestUnclaimed && (
          <button
            onClick={() => markServing(oldestUnclaimed.id)}
            disabled={claimingId !== null}
            className="text-xs font-medium px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Claim Next
          </button>
        )}
      </div>

      {/* Waiting List */}
      <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1.5">
        {waiting.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm">No customers waiting</span>
          </div>
        ) : (
          waiting.map((entry, index) => {
            const waitMin = getWaitMinutes(entry.checked_in_at)
            const isClaimed = !!entry.employee_id
            const budtenderName = entry.employees
              ? `${entry.employees.first_name} ${entry.employees.last_name?.[0] ?? ''}.`
              : null
            const type = getCustomerType(entry)

            return (
              <div
                key={entry.id}
                className={`relative border-l-4 ${getWaitBorderColor(waitMin)} rounded-lg px-3 py-2.5 ${
                  isClaimed ? 'bg-gray-900/60 opacity-60' : 'bg-gray-900/40'
                } hover:bg-gray-700/40 transition-colors group`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Position */}
                    <span className="text-xs font-mono text-gray-500 w-5 text-right flex-shrink-0">
                      #{index + 1}
                    </span>

                    {/* Name */}
                    <span className="text-sm font-medium text-gray-50 truncate">
                      {getDisplayName(entry)}
                    </span>

                    {/* Type Badge */}
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        type === 'medical'
                          ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                          : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                      }`}
                    >
                      {type === 'medical' ? 'MED' : 'REC'}
                    </span>

                    {/* Party size if > 1 */}
                    {entry.party_size > 1 && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        +{entry.party_size - 1}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Source */}
                    <span className="text-[10px] text-gray-500 hidden sm:inline">
                      {SOURCE_LABELS[entry.source] ?? entry.source}
                    </span>

                    {/* Wait time */}
                    <span className={`text-xs font-mono font-medium ${getWaitColor(waitMin)}`}>
                      {formatWaitTime(waitMin)}
                    </span>

                    {/* Claim button */}
                    {!isClaimed ? (
                      <button
                        onClick={() => markServing(entry.id)}
                        disabled={claimingId !== null}
                        className="text-[10px] font-medium px-2 py-1 bg-emerald-600/80 text-white rounded hover:bg-emerald-500 disabled:opacity-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Claim
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-500 italic">
                        {budtenderName ?? 'Claimed'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {entry.notes && (
                  <p className="text-[10px] text-gray-500 mt-1 ml-7 truncate">{entry.notes}</p>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Now Serving Section */}
      {serving.length > 0 && (
        <div className="border-t border-gray-700">
          <button
            onClick={() => setShowServing(!showServing)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            <span className="uppercase tracking-wide font-semibold">
              Now Serving ({serving.length})
            </span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showServing ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showServing && (
            <div className="px-2 pb-2 space-y-1">
              {serving.map(entry => {
                const budtenderName = entry.employees
                  ? `${entry.employees.first_name} ${entry.employees.last_name?.[0] ?? ''}.`
                  : 'Unknown'
                const type = getCustomerType(entry)
                const serveMin = entry.started_at ? getWaitMinutes(entry.started_at) : 0

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 bg-emerald-900/20 border border-emerald-800/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                      <span className="text-sm text-gray-200 truncate">{getDisplayName(entry)}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          type === 'medical'
                            ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                            : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                        }`}
                      >
                        {type === 'medical' ? 'MED' : 'REC'}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        w/ {budtenderName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-500 font-mono">{formatWaitTime(serveMin)}</span>
                      <button
                        onClick={() => completeEntry(entry.id)}
                        className="text-[10px] font-medium px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                      >
                        Done
                      </button>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="text-[10px] font-medium px-1.5 py-1 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
