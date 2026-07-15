import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { DEFAULT_SETTINGS } from '@/lib/settings/schema'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  listAccessibleLocations: vi.fn(),
  requireAccessibleLocation: vi.fn(),
  getEffectiveSettings: vi.fn(),
  getSettingsSnapshot: vi.fn(),
  patchLocationSettings: vi.fn(),
  patchOrganizationSettings: vi.fn(),
  removeLocationSetting: vi.fn(),
  removeOrganizationSetting: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/settings/access', () => ({
  listAccessibleLocations: mocks.listAccessibleLocations,
  requireAccessibleLocation: mocks.requireAccessibleLocation,
}))
vi.mock('@/lib/settings/service', () => ({
  getEffectiveSettings: mocks.getEffectiveSettings,
  getSettingsSnapshot: mocks.getSettingsSnapshot,
  patchLocationSettings: mocks.patchLocationSettings,
  patchOrganizationSettings: mocks.patchOrganizationSettings,
  removeLocationSetting: mocks.removeLocationSetting,
  removeOrganizationSetting: mocks.removeOrganizationSetting,
}))

import { GET, PATCH } from '../route'

const locationId = '11111111-1111-4111-8111-111111111111'
const inaccessibleId = '22222222-2222-4222-8222-222222222222'
const session = { organizationId: 'org-1', locationId, employeeId: 'emp-1', role: 'manager' }
const location = { id: locationId, name: 'Central', city: 'Albuquerque', state: 'NM' }

describe('settings hub API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue(session)
    mocks.listAccessibleLocations.mockResolvedValue([location])
    mocks.requireAccessibleLocation.mockResolvedValue(location)
    mocks.getEffectiveSettings.mockResolvedValue(DEFAULT_SETTINGS)
    mocks.getSettingsSnapshot.mockResolvedValue({ organization: {}, location: {} })
    mocks.patchLocationSettings.mockResolvedValue({ checkout: { require_customer: true } })
  })

  it('rejects a preselected location outside employee_locations', async () => {
    const request = new NextRequest(`http://localhost/api/settings/location-settings?location_id=${inaccessibleId}`)

    const response = await GET(request)

    expect(response.status).toBe(404)
    expect(mocks.getSettingsSnapshot).not.toHaveBeenCalled()
  })

  it('returns only the access-scoped picker locations and effective settings', async () => {
    const response = await GET(new NextRequest('http://localhost/api/settings/location-settings'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.locations).toEqual([location])
    expect(body.effective).toEqual(DEFAULT_SETTINGS)
    expect(body.selected_location_id).toBe(locationId)
  })

  it('authorizes the selected location and delegates a key-level patch', async () => {
    const patch = { checkout: { require_customer: true } }
    const request = new NextRequest('http://localhost/api/settings/location-settings', {
      method: 'PATCH',
      body: JSON.stringify({ scope: 'location', location_id: locationId, patch }),
    })

    expect((await PATCH(request)).status).toBe(200)
    expect(mocks.requireAccessibleLocation).toHaveBeenCalledWith(session, locationId)
    expect(mocks.patchLocationSettings).toHaveBeenCalledWith(locationId, patch)
  })
})
