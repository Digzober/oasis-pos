import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { clearBioTrackConfigCache, isBioTrackEnabled } from '../configLoader'

function mockConfigResult(...results: Array<{ data: { is_enabled: boolean } | null; error: unknown }>) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.maybeSingle.mockImplementation(async () => results.shift())
  mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) })
  return query
}

describe('BioTrack enablement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearBioTrackConfigCache()
  })

  it('disables sync only when the location row is explicitly false', async () => {
    mockConfigResult({ data: { is_enabled: false }, error: null })

    await expect(isBioTrackEnabled('loc-disabled')).resolves.toBe(false)
  })

  it('defaults sync on when the location row is missing', async () => {
    mockConfigResult({ data: null, error: null })

    await expect(isBioTrackEnabled('loc-unconfigured')).resolves.toBe(true)
  })

  it('defaults sync on when enablement cannot be loaded', async () => {
    mockConfigResult({ data: null, error: { message: 'database unavailable' } })

    await expect(isBioTrackEnabled('loc-error')).resolves.toBe(true)
  })

  it('clears the five-minute enablement cache with the config cache', async () => {
    const query = mockConfigResult(
      { data: { is_enabled: false }, error: null },
      { data: { is_enabled: true }, error: null },
    )

    await expect(isBioTrackEnabled('loc-cached')).resolves.toBe(false)
    await expect(isBioTrackEnabled('loc-cached')).resolves.toBe(false)
    expect(query.maybeSingle).toHaveBeenCalledOnce()

    clearBioTrackConfigCache('loc-cached')
    await expect(isBioTrackEnabled('loc-cached')).resolves.toBe(true)
    expect(query.maybeSingle).toHaveBeenCalledTimes(2)
  })
})
