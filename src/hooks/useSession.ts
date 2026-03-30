'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { SessionPayload } from '@/lib/auth/session'

export function useSession() {
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSession(data?.session ?? null))
      .catch(() => setSession(null))
      .finally(() => setIsLoading(false))
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setSession(null)
    router.push('/login')
  }, [router])

  return { session, isLoading, logout }
}
