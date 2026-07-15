import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  clearBioTrackConfigCache: vi.fn(),
  clearBioTrackClientCache: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('@/lib/biotrack/configLoader', () => ({
  clearBioTrackConfigCache: mocks.clearBioTrackConfigCache,
}))
vi.mock('@/lib/biotrack/client', () => ({
  clearBioTrackClientCache: mocks.clearBioTrackClientCache,
}))

import { PATCH } from '../route'

describe('BioTrack config cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue({ locationId: 'loc-1' })

    const query = {
      upsert: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({
        data: { location_id: 'loc-1', is_enabled: false },
        error: null,
      }),
    }
    query.upsert.mockReturnValue(query)
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) })
  })

  it('clears both loader and location-client caches after a successful PATCH', async () => {
    const response = await PATCH(new NextRequest('http://localhost/api/settings/biotrack-config', {
      method: 'PATCH',
      body: JSON.stringify({ is_enabled: false }),
    }))

    expect(response.status).toBe(200)
    expect(mocks.clearBioTrackConfigCache).toHaveBeenCalledWith('loc-1')
    expect(mocks.clearBioTrackClientCache).toHaveBeenCalledWith('loc-1')
  })
})
