import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { getDeliveryConfig, listZones, saveDeliveryConfig } from '../deliveryService'

function query(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  return chain
}

describe('delivery persistence schema fidelity', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads organization-scoped config without a nonexistent is_active filter', async () => {
    const chain = query({ data: { organization_id: 'org-1' }, error: null })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => chain) })

    await expect(getDeliveryConfig('org-1')).resolves.toMatchObject({ organization_id: 'org-1' })
    expect(chain.eq).toHaveBeenCalledTimes(1)
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  })

  it('lists zones by organization ownership', async () => {
    const chain = query({ data: [], error: null })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => chain) })

    await listZones('org-1')

    expect(chain.eq).toHaveBeenNthCalledWith(1, 'organization_id', 'org-1')
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'is_active', true)
  })

  it('persists canonical delivery config columns and propagates database errors', async () => {
    const error = { message: 'database unavailable' }
    const chain = query({ data: null, error })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => chain) })

    await expect(saveDeliveryConfig('org-1', {
      max_total_value: 500,
      max_total_weight_grams: 2000,
    })).rejects.toThrow('database unavailable')
    expect(chain.upsert).toHaveBeenCalledWith({
      organization_id: 'org-1',
      max_total_value: 500,
      max_total_weight_grams: 2000,
    }, { onConflict: 'organization_id' })
  })

  it('propagates config read errors', async () => {
    const chain = query({ data: null, error: { message: 'read failed' } })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => chain) })

    await expect(getDeliveryConfig('org-1')).rejects.toThrow('read failed')
  })
})
