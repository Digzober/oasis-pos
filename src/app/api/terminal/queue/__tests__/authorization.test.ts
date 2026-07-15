import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  requireAccessibleLocation: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getSettingsSnapshot: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/settings/access', () => ({
  requireAccessibleLocation: mocks.requireAccessibleLocation,
}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('@/lib/settings/service', () => ({ getSettingsSnapshot: mocks.getSettingsSnapshot }))
vi.mock('@/lib/guestlist/workflowMappings', () => ({
  resolveGuestlistCheckInStatusId: vi.fn(),
  getGuestlistWorkflowEventsByStatusId: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { DELETE, GET, PATCH } from '../route'

const SESSION = { organizationId: 'org-1', locationId: 'location-session', employeeId: 'employee-1' }
const ENTRY_ID = '00000000-0000-4000-8000-000000000001'

describe('terminal queue location authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue(SESSION)
    mocks.requireAccessibleLocation.mockResolvedValue({ id: 'location-requested' })
    mocks.getSettingsSnapshot.mockResolvedValue({ location: {} })
  })

  it('authorizes the requested location before returning queue card data', async () => {
    mocks.createSupabaseServerClient.mockResolvedValue(createClient([
      { data: [], error: null },
    ]))

    const response = await GET(new NextRequest(
      'http://localhost/api/terminal/queue?location_id=location-requested',
    ))

    expect(response.status).toBe(200)
    expect(mocks.requireAccessibleLocation).toHaveBeenCalledWith(SESSION, 'location-requested')
  })

  it('authorizes the entry location before updating it', async () => {
    mocks.createSupabaseServerClient.mockResolvedValue(createClient([
      { data: { location_id: 'location-owned' }, error: null },
      { data: { id: ENTRY_ID }, error: null },
    ]))
    const request = new Request('http://localhost/api/terminal/queue', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ENTRY_ID }),
    })

    expect((await PATCH(request as never)).status).toBe(200)
    expect(mocks.requireAccessibleLocation).toHaveBeenCalledWith(SESSION, 'location-owned')
  })

  it('authorizes the entry location before cancelling it', async () => {
    mocks.createSupabaseServerClient.mockResolvedValue(createClient([
      { data: { location_id: 'location-owned' }, error: null },
      { data: null, error: null },
    ]))

    const response = await DELETE(new NextRequest(
      `http://localhost/api/terminal/queue?id=${ENTRY_ID}`,
    ))

    expect(response.status).toBe(200)
    expect(mocks.requireAccessibleLocation).toHaveBeenCalledWith(SESSION, 'location-owned')
  })
})

function createClient(results: Array<{ data: unknown; error: unknown }>) {
  return {
    from: vi.fn(() => {
      const result = results.shift() ?? { data: null, error: null }
      const query = {
        select: vi.fn(() => query), eq: vi.fn(() => query), or: vi.fn(() => query),
        is: vi.fn(() => query), order: vi.fn(() => query), update: vi.fn(() => query),
        maybeSingle: vi.fn(() => Promise.resolve(result)),
        single: vi.fn(() => Promise.resolve(result)),
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      }
      return query
    }),
  }
}
