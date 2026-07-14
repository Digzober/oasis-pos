import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { GET } from '../route'

describe('Dutchie settings authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue({
      employeeId: 'employee-1',
      organizationId: 'org-1',
      locationId: 'location-1',
      role: 'budtender',
      permissions: [],
    })
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      order: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)
    query.order.mockReturnValue(query)
    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => query),
    })
  })

  it('blocks non-manager employees', async () => {
    const response = await GET()

    expect(response.status).toBe(403)
  })

  it('never returns the stored API key', async () => {
    mocks.requireSession.mockResolvedValue({
      employeeId: 'employee-1',
      organizationId: 'org-1',
      locationId: 'location-1',
      role: 'manager',
      permissions: [],
    })
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      order: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          location_id: 'location-1',
          api_key_encrypted: 'super-secret-key-1234',
          is_enabled: true,
        },
        error: null,
      }),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)
    query.order.mockReturnValue(query)
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.config).toMatchObject({ hasApiKey: true, apiKeyTail: '****...1234' })
    expect(body.config.apiKey).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain('super-secret-key-1234')
  })
})
