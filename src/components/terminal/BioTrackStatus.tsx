'use client'

import { useState, useEffect } from 'react'

export default function BioTrackStatus() {
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/biotrack/status')
        if (res.ok) {
          const data = await res.json()
          setUnsyncedCount(data.unsynced_count ?? 0)
        }
      } catch {
        // Silent — don't block UI for status checks
      }
    }
    check()
    const id = setInterval(check, 60_000) // check every minute
    return () => clearInterval(id)
  }, [])

  const color =
    unsyncedCount === 0
      ? 'bg-emerald-400'
      : unsyncedCount <= 5
        ? 'bg-amber-400'
        : 'bg-red-500'

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
      >
        <span className={`w-2 h-2 rounded-full ${color}`} />
        BT
        {unsyncedCount > 0 && (
          <span className="bg-gray-600 text-gray-300 text-[10px] px-1 rounded">
            {unsyncedCount}
          </span>
        )}
      </button>

      {showDetails && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDetails(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-3">
            <p className="text-xs text-gray-400 font-semibold mb-1">BioTrack Sync</p>
            {unsyncedCount === 0 ? (
              <p className="text-xs text-emerald-400">All sales synced</p>
            ) : (
              <p className="text-xs text-amber-400">
                {unsyncedCount} sale{unsyncedCount > 1 ? 's' : ''} pending sync
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
