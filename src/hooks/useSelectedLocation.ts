'use client'

import { useEffect } from 'react'
import { useLocationStore } from '@/stores/locationStore'

export function useSelectedLocation() {
  const locationId = useLocationStore(s => s.locationId)
  const locationName = useLocationStore(s => s.locationName)
  const setLocation = useLocationStore(s => s.setLocation)
  const requireLocation = useLocationStore(s => s.requireLocation)
  const hydrate = useLocationStore(s => s.hydrate)
  const hydrated = useLocationStore(s => s._hydrated)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return { locationId, locationName, setLocation, requireLocation, hydrated }
}
