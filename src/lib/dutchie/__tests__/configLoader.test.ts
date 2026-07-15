import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { clearDutchieConfigCache, loadDutchieConfig } from '../configLoader'
import { encryptSecret } from '@/lib/security/settingsSecrets.server'

const KEY = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'

function configRow() {
  return {
    location_id: 'loc-1',
    is_enabled: true,
    api_key_encrypted: 'secret',
    dutchie_location_id: 'dutchie-1',
    dutchie_location_name: 'Main',
    sync_employees: true,
    sync_customers: true,
    sync_products: true,
    sync_inventory: true,
    sync_rooms: true,
    sync_transactions: true,
    sync_loyalty: true,
  }
}

describe('Dutchie config cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearDutchieConfigCache()
    process.env.SETTINGS_SECRET_KEY = KEY
  })

  afterEach(() => {
    delete process.env.SETTINGS_SECRET_KEY
  })

  it('invalidates organization-qualified cache entries by location', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: configRow(), error: null }),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    const from = vi.fn().mockReturnValue(query)
    mocks.createSupabaseServerClient.mockResolvedValue({ from })

    await loadDutchieConfig('loc-1', 'org-1')
    await loadDutchieConfig('loc-1', 'org-1')
    expect(mocks.createSupabaseServerClient).toHaveBeenCalledTimes(1)

    clearDutchieConfigCache('loc-1')
    await loadDutchieConfig('loc-1', 'org-1')
    expect(mocks.createSupabaseServerClient).toHaveBeenCalledTimes(2)
  })

  it('decrypts the stored API key before constructing runtime config', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { ...configRow(), api_key_encrypted: encryptSecret('runtime-secret') },
        error: null,
      }),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) })

    const config = await loadDutchieConfig('loc-1', 'org-1')

    expect(config?.apiKey).toBe('runtime-secret')
  })
})
