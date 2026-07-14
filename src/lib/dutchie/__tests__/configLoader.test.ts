import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { clearDutchieConfigCache, loadDutchieConfig } from '../configLoader'

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
})
