'use client'

import { useState, useEffect } from 'react'
import BioTrackStatus from './BioTrackStatus'
import OfflineQueuePanel from './OfflineQueuePanel'
import { useConnectivity } from '@/hooks/useConnectivity'
import { useSession } from '@/hooks/useSession'
import { getLastCacheTime } from '@/lib/offline/offlineCache'

export default function StatusBar() {
  const { isOnline, queueDepth } = useConnectivity()
  const { session } = useSession()
  const [time, setTime] = useState('')
  const [cacheAge, setCacheAge] = useState('')
  const [showQueue, setShowQueue] = useState(false)

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
      const cached = getLastCacheTime()
      if (cached) {
        const mins = Math.floor((Date.now() - cached.getTime()) / 60000)
        setCacheAge(mins < 1 ? '<1m' : `${mins}m`)
      }
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="h-8 bg-gray-900/80 border-t border-gray-800/60 px-4 flex items-center text-[11px] font-mono shrink-0">
      {showQueue && <OfflineQueuePanel onClose={() => setShowQueue(false)} />}

      {/* Left: connectivity */}
      <button
        onClick={() => !isOnline && queueDepth > 0 && setShowQueue(true)}
        className="flex items-center gap-1.5"
      >
        {isOnline ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-gray-500">Online</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400">Offline</span>
            {queueDepth > 0 && (
              <span className="bg-red-500/20 text-red-400 px-1.5 rounded text-[10px]">
                {queueDepth}
              </span>
            )}
          </>
        )}
      </button>

      {/* Center: register + cache age */}
      <div className="flex-1 flex items-center justify-center gap-2">
        <span className="text-gray-600">
          {session?.registerName || 'No Register'}
        </span>
        {cacheAge && (
          <>
            <span className="text-gray-800">|</span>
            <span className="text-gray-700">Data: {cacheAge} ago</span>
          </>
        )}
      </div>

      {/* Right: BioTrack + clock */}
      <div className="flex items-center gap-3">
        <BioTrackStatus />
        <span className="text-gray-500 tabular-nums">{time}</span>
      </div>
    </div>
  )
}
