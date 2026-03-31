'use client'

import { usePermissions } from '@/hooks/usePermissions'

interface PermissionGateProps {
  permission?: string
  permissions?: string[]
  mode?: 'any' | 'all'
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({ permission, permissions, mode = 'any', fallback = null, children }: PermissionGateProps) {
  const { can, canAny, canAll, loading } = usePermissions()

  if (loading) return null

  let allowed = false

  if (permission) {
    allowed = can(permission)
  } else if (permissions && permissions.length > 0) {
    allowed = mode === 'all' ? canAll(permissions) : canAny(permissions)
  } else {
    allowed = true // no permission specified = always show
  }

  return allowed ? <>{children}</> : <>{fallback}</>
}
