import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ loadBioTrackConfig: vi.fn() }))

vi.mock('../configLoader', () => ({ loadBioTrackConfig: mocks.loadBioTrackConfig }))

import { clearBioTrackClientCache, getBioTrackClientForLocation } from '../client'

describe('BioTrack location client cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearBioTrackClientCache()
    mocks.loadBioTrackConfig.mockResolvedValue({
      v1Url: '',
      v3Url: 'https://biotrack.example/v1',
      username: 'user',
      password: 'password',
      licenseNumber: 'license',
    })
  })

  it('reloads a location client after that cache entry is cleared', async () => {
    await getBioTrackClientForLocation('loc-1')
    await getBioTrackClientForLocation('loc-1')
    expect(mocks.loadBioTrackConfig).toHaveBeenCalledOnce()

    clearBioTrackClientCache('loc-1')
    await getBioTrackClientForLocation('loc-1')

    expect(mocks.loadBioTrackConfig).toHaveBeenCalledTimes(2)
  })
})
