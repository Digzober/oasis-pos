'use client'

import { useState, useCallback, useEffect } from 'react'
import Cookies from 'js-cookie'

const COOKIE_KEY = 'oasis-location-id'
const NAME_KEY = 'oasis-location-name'

export function useSelectedLocation() {
  const [locationId, setLocationIdState] = useState<string | null>(null)
  const [locationName, setLocationName] = useState('All Locations')

  useEffect(() => {
    const id = Cookies.get(COOKIE_KEY) ?? null
    const name = Cookies.get(NAME_KEY) ?? 'All Locations'
    setLocationIdState(id)
    setLocationName(name)
  }, [])

  const setLocation = useCallback((id: string | null, name?: string) => {
    if (id) {
      Cookies.set(COOKIE_KEY, id, { expires: 365 })
      Cookies.set(NAME_KEY, name ?? 'Location', { expires: 365 })
    } else {
      Cookies.remove(COOKIE_KEY)
      Cookies.set(NAME_KEY, 'All Locations', { expires: 365 })
    }
    setLocationIdState(id)
    setLocationName(name ?? 'All Locations')
    window.dispatchEvent(new CustomEvent('location-change', { detail: { locationId: id } }))
  }, [])

  const requireLocation = useCallback((): string => {
    const id = Cookies.get(COOKIE_KEY)
    if (!id) throw new Error('Please select a specific location')
    return id
  }, [])

  return { locationId, locationName, setLocation, requireLocation }
}
