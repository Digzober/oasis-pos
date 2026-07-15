import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireDutchieManager: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  constructedKey: '',
  whoami: vi.fn(),
}))

vi.mock('@/lib/auth/dutchie', () => ({
  requireDutchieManager: mocks.requireDutchieManager,
}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('@/lib/dutchie/client', () => ({
  DutchieClient: class {
    constructor(key: string) {
      mocks.constructedKey = key
    }

    whoami() {
      return mocks.whoami()
    }
  },
}))

import { encryptSecret } from '@/lib/security/settingsSecrets.server'
import { POST } from '../route'

const KEY = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'

describe('Dutchie connection test credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.constructedKey = ''
    process.env.SETTINGS_SECRET_KEY = KEY
    mocks.requireDutchieManager.mockResolvedValue({
      locationId: 'loc-1',
      organizationId: 'org-1',
    })
    mocks.whoami.mockResolvedValue({
      valid: true,
      locationName: 'Main',
      locationId: 17,
      companyName: 'Oasis',
    })

    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { api_key_encrypted: encryptSecret('dutchie-runtime-key') },
        error: null,
      }),
      update: vi.fn(),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.update.mockReturnValue(query)
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) })
  })

  afterEach(() => {
    delete process.env.SETTINGS_SECRET_KEY
  })

  it('decrypts the API key before constructing the Dutchie client', async () => {
    const response = await POST()

    expect(response.status).toBe(200)
    expect(mocks.constructedKey).toBe('dutchie-runtime-key')
  })
})
