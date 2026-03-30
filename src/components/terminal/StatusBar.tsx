'use client'

import { useState, useEffect } from 'react'

export default function StatusBar() {
  const [online, setOnline] = useState(true)
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine)
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      )
    }
    update()
    const id = setInterval(update, 1000)

    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      clearInterval(id)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return (
    <div className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-400 shrink-0">
      {/* Left: connectivity */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-500'}`}
        />
        {online ? 'Online' : 'Offline'}
      </div>

      {/* Center: Register */}
      <div className="flex-1 text-center">Register 1</div>

      {/* Right: clock */}
      <div className="tabular-nums">{time}</div>
    </div>
  )
}
