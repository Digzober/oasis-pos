import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { listAccessibleLocations } from '../access'
import type { SessionPayload } from '@/lib/auth/session'

function assignmentQuery(locationIds: string[]) {
  const query = { select: vi.fn(), eq: vi.fn() }
  query.select.mockReturnValue(query)
  query.eq.mockResolvedValue({
    data: locationIds.map((location_id) => ({ location_id })), error: null,
  })
  return query
}

function locationQuery() {
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn() }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.in.mockReturnValue(query)
  query.order.mockResolvedValue({
    data: [{ id: 'loc-1', name: 'Central', city: 'Albuquerque', state: 'NM' }],
    error: null,
  })
  return query
}

const session = {
  employeeId: 'emp-1', organizationId: 'org-1', locationId: 'loc-1',
  role: 'manager',
} as SessionPayload

describe('settings location access', () => {
  beforeEach(() => vi.clearAllMocks())

  it('limits a non-admin picker to employee_locations assignments', async () => {
    const assignments = assignmentQuery(['loc-1'])
    const locations = locationQuery()
    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => table === 'employee_locations' ? assignments : locations),
    })

    await listAccessibleLocations(session)

    expect(locations.in).toHaveBeenCalledWith('id', ['loc-1'])
  })

  it('allows an owner to list all active organization locations', async () => {
    const locations = locationQuery()
    const from = vi.fn(() => locations)
    mocks.createSupabaseServerClient.mockResolvedValue({ from })

    await listAccessibleLocations({ ...session, role: 'owner' })

    expect(from).toHaveBeenCalledOnce()
    expect(locations.in).not.toHaveBeenCalled()
  })
})
