'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from './useSession'

export function usePermissions() {
  const { session } = useSession()
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) { setLoading(false); return }

    // If session already has permissions (loaded from /api/auth/me)
    if (session.permissions.length > 0) {
      setPermissions(session.permissions)
      setLoading(false)
      return
    }

    // Fetch from /api/auth/me which loads from DB
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setPermissions(d.session?.permissions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session])

  const can = useCallback((key: string) => permissions.includes(key), [permissions])
  const canAny = useCallback((keys: string[]) => keys.some((k) => permissions.includes(k)), [permissions])
  const canAll = useCallback((keys: string[]) => keys.every((k) => permissions.includes(k)), [permissions])

  const role = session?.role ?? 'budtender'
  const isManager = role === 'manager' || role === 'admin' || role === 'owner' || can('GENERAL_ADMIN_POS_MANAGER')
  const isAdmin = role === 'admin' || role === 'owner' || can('GENERAL_ADMIN_ADMINISTRATOR')
  const isOwner = role === 'owner'

  return { permissions, loading, can, canAny, canAll, isManager, isAdmin, isOwner }
}
