'use client'

import { useState, useEffect, useCallback } from 'react'
import { getPendingCount } from '@/lib/offline/transactionQueue'

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(true)
  const [lastOnline, setLastOnline] = useState<Date | null>(new Date())
  const [queueDepth, setQueueDepth] = useState(0)

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { method: 'GET', cache: 'no-store' })
      const online = res.ok || res.status === 401 // 401 means server is reachable
      setIsOnline(online)
      if (online) setLastOnline(new Date())
    } catch {
      setIsOnline(false)
    }
  }, [])

  const updateQueue = useCallback(async () => {
    try { setQueueDepth(await getPendingCount()) } catch { /* IndexedDB unavailable */ }
  }, [])

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const goOnline = () => { setIsOnline(true); setLastOnline(new Date()) }
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    const healthId = setInterval(checkHealth, 30000)
    const queueId = setInterval(updateQueue, 5000)
    updateQueue()

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(healthId)
      clearInterval(queueId)
    }
  }, [checkHealth, updateQueue])

  return { isOnline, lastOnline, queueDepth }
}
