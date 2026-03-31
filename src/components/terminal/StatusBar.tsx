'use client'

import { useState, useEffect } from 'react'
import BioTrackStatus from './BioTrackStatus'
import OfflineQueuePanel from './OfflineQueuePanel'
import { useConnectivity } from '@/hooks/useConnectivity'
import { getLastCacheTime } from '@/lib/offline/offlineCache'

export default function StatusBar() {
  const { isOnline, queueDepth } = useConnectivity()
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
    <div className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-400 shrink-0">
      {showQueue && <OfflineQueuePanel onClose={() => setShowQueue(false)} />}

      {/* Left: connectivity */}
      <button onClick={() => queueDepth > 0 && setShowQueue(true)} className="flex items-center gap-1.5 hover:text-gray-300">
        <span className={`w-2 h-2 rounded-full ${isOnline ? (queueDepth > 0 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-red-500'}`} />
        {isOnline ? 'Online' : 'Offline'}
        {queueDepth > 0 && <span className="bg-amber-600 text-white text-[10px] px-1 rounded">{queueDepth}</span>}
      </button>

      {/* Center: Register + cache age */}
      <div className="flex-1 text-center">
        Register 1
        {cacheAge && <span className="ml-2 text-gray-500">Data: {cacheAge} ago</span>}
      </div>

      {/* Right: BioTrack + clock */}
      <div className="flex items-center gap-3">
        <BioTrackStatus />
        <span className="tabular-nums">{time}</span>
      </div>
    </div>
  )
}
