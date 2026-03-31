'use client'

import { createContext, useContext } from 'react'
import type { SessionPayload } from '@/lib/auth/session'

interface BackofficeContextValue {
  employee: {
    id: string
    name: string
    role: string
  }
  permissions: string[]
  locationId: string | null
  organizationId: string
}

const BackofficeContext = createContext<BackofficeContextValue | null>(null)

export function BackofficeProvider({ session, locationId, children }: { session: SessionPayload; locationId: string | null; children: React.ReactNode }) {
  return (
    <BackofficeContext.Provider value={{
      employee: { id: session.employeeId, name: session.employeeName, role: session.role },
      permissions: session.permissions,
      locationId,
      organizationId: session.organizationId,
    }}>
      {children}
    </BackofficeContext.Provider>
  )
}

export function useBackoffice() {
  const ctx = useContext(BackofficeContext)
  if (!ctx) throw new Error('useBackoffice must be used within BackofficeProvider')
  return ctx
}
