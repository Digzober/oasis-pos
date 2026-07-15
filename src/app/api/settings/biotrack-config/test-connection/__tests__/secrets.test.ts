import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { encryptSecret } from '@/lib/security/settingsSecrets.server'
import { POST } from '../route'

const KEY = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'

describe('BioTrack connection test credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SETTINGS_SECRET_KEY = KEY
    mocks.requireSession.mockResolvedValue({ locationId: 'loc-1' })
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          is_enabled: true,
          rest_api_url: 'https://biotrack.example.test/v1',
          xml_api_url: '',
          username_encrypted: encryptSecret('runtime-user'),
          password_encrypted: encryptSecret('runtime-password'),
          ubi: 'license-1',
        },
        error: null,
      }),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ Session: 'session-1' }),
    }))
  })

  afterEach(() => {
    delete process.env.SETTINGS_SECRET_KEY
    vi.unstubAllGlobals()
  })

  it('decrypts credentials before the external authentication request', async () => {
    const response = await POST()
    const [, init] = vi.mocked(fetch).mock.calls[0]!
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ Username: 'runtime-user', Password: 'runtime-password' })
  })
})
