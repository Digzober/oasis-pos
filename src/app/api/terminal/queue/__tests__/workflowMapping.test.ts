import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  resolveStatus: vi.fn(),
  requireAccessibleLocation: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('@/lib/guestlist/workflowMappings', () => ({
  resolveGuestlistCheckInStatusId: mocks.resolveStatus,
  getGuestlistWorkflowEventsByStatusId: vi.fn(),
}))
vi.mock('@/lib/settings/access', () => ({
  requireAccessibleLocation: mocks.requireAccessibleLocation,
}))
vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { POST } from '../route'

describe('terminal queue workflow mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue({ locationId: 'location-session' })
    mocks.requireAccessibleLocation.mockResolvedValue({ id: 'location-session' })
    mocks.resolveStatus.mockResolvedValue('status-online-pickup')
    mocks.createSupabaseServerClient.mockResolvedValue(createQueueClient())
  })

  it('uses the source workflow mapping for a queue check-in', async () => {
    const request = new Request('http://localhost/api/terminal/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_id: '00000000-0000-4000-8000-000000000010',
        customer_name: 'Queue Customer',
        customer_type: 'recreational',
        source: 'online_pickup',
      }),
    })

    const response = await POST(request as never)

    expect(response.status).toBe(201)
    expect(mocks.resolveStatus).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000010',
      'online_pickup',
      expect.anything(),
    )
    expect(mocks.requireAccessibleLocation).toHaveBeenCalledWith(
      expect.anything(),
      '00000000-0000-4000-8000-000000000010',
    )
  })
})

function createQueueClient() {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { position: 0 }, error: null })
  const single = vi.fn().mockResolvedValue({ data: { id: 'entry-1' }, error: null })
  return {
    from: vi.fn(() => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        is: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        insert: vi.fn(() => query),
        maybeSingle,
        single,
      }
      return query
    }),
  }
}
