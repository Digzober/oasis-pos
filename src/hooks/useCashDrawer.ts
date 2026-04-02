'use client'

import { useState, useEffect, useCallback } from 'react'

interface CashDrawer {
  id: string
  status: 'open' | 'closed'
  opening_amount: number
}

export function useCashDrawer(registerId: string) {
  const [drawer, setDrawer] = useState<CashDrawer | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchDrawer = useCallback(async () => {
    if (!registerId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/registers/${registerId}`)
      if (res.ok) {
        const data = await res.json()
        setDrawer(data.open_drawer ?? null)
      }
    } catch {
      // keep null
    } finally {
      setIsLoading(false)
    }
  }, [registerId])

  useEffect(() => { fetchDrawer() }, [fetchDrawer])

  const openDrawer = useCallback(async (openingAmount: number, locationId: string, employeeId: string) => {
    try {
      const res = await fetch('/api/cash-drawers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          register_id: registerId,
          location_id: locationId,
          opened_by: employeeId,
          opening_amount: openingAmount,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setDrawer({ id: data.drawer.id, status: 'open', opening_amount: openingAmount })
        return data.drawer
      }
    } catch {
      // fail silently
    }
    return null
  }, [registerId])

  return { drawer, isLoading, openDrawer, refresh: fetchDrawer }
}
