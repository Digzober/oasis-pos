import { create } from 'zustand'
import Cookies from 'js-cookie'

const COOKIE_KEY = 'oasis-location-id'
const NAME_KEY = 'oasis-location-name'

interface LocationState {
  locationId: string | null
  locationName: string
  _hydrated: boolean
  hydrate: () => void
  setLocation: (id: string | null, name?: string) => void
  requireLocation: () => string
}

export const useLocationStore = create<LocationState>((set, get) => ({
  locationId: null,
  locationName: 'All Locations',
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return
    const id = Cookies.get(COOKIE_KEY) ?? null
    const name = Cookies.get(NAME_KEY) ?? 'All Locations'
    set({ locationId: id, locationName: name, _hydrated: true })
  },

  setLocation: (id, name) => {
    if (id) {
      Cookies.set(COOKIE_KEY, id, { expires: 365, path: '/' })
      Cookies.set(NAME_KEY, name ?? 'Location', { expires: 365, path: '/' })
    } else {
      Cookies.remove(COOKIE_KEY, { path: '/' })
      Cookies.set(NAME_KEY, 'All Locations', { expires: 365, path: '/' })
    }
    set({ locationId: id, locationName: name ?? 'All Locations' })
  },

  requireLocation: () => {
    const id = get().locationId
    if (!id) throw new Error('Please select a specific location')
    return id
  },
}))
