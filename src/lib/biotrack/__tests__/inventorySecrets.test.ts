import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { encryptSecret } from '@/lib/security/settingsSecrets.server'
import { fetchPendingManifests } from '../inventorySync'

describe('BioTrack inventory credential decryption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SETTINGS_SECRET_KEY = '44'.repeat(32)
  })

  it('sends decrypted credentials to the v1 manifest login', async () => {
    const row = {
      xml_api_url: 'https://example.test/serverxml.asp',
      username_encrypted: encryptSecret('saved-user'),
      password_encrypted: encryptSecret('saved-password'),
      ubi: 'license-1',
      biotrack_location_id: 'bt-location-1',
    }
    const query = {
      select: vi.fn(() => query), eq: vi.fn(() => query),
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    }
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ json: async () => ({ success: true, sessionid: 'session-1' }) } as Response)
      .mockResolvedValueOnce({ json: async () => ({ success: true, manifest: [] }) } as Response)

    await fetchPendingManifests('bt-location-1', 'org-1')

    const loginBody = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))
    expect(loginBody).toMatchObject({ username: 'saved-user', password: 'saved-password' })
    expect(loginBody.username).not.toContain('settings:v1')
  })
})
