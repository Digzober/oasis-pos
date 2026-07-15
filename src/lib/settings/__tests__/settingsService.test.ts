import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import {
  clearEffectiveSettingsCache,
  getEffectiveSettings,
  patchLocationSettings,
  removeLocationSetting,
} from '../service'

function singleQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: result, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}

describe('effective settings and atomic patches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearEffectiveSettingsCache()
  })

  it('resolves location override over organization default over code default', async () => {
    const queries = {
      locations: singleQuery({ organization_id: 'org-1' }),
      location_settings: singleQuery({ settings: { checkout: { require_customer: true } } }),
      organization_settings: singleQuery({
        settings: {
          checkout: { rounding_method: 'round_up_025', require_customer: false },
          online: { reserve_inventory: true },
        },
      }),
    }
    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: keyof typeof queries) => queries[table]),
    })

    const effective = await getEffectiveSettings('loc-1')

    expect(effective.checkout).toEqual({
      rounding_method: 'round_up_025',
      require_customer: true,
    })
    expect(effective.online.reserve_inventory).toBe(true)
    expect(effective.inventory.low_stock_threshold).toBe(5)
    await getEffectiveSettings('loc-1')
    expect(mocks.createSupabaseServerClient).toHaveBeenCalledOnce()
  })

  it('uses atomic RPC patches so unrelated stale-tab writes cannot clobber each other', async () => {
    const state: Record<string, unknown> = {}
    const rpc = vi.fn(async (_name: string, args: { p_patch: Record<string, unknown> }) => {
      Object.assign(state, deepMerge(state, args.p_patch))
      return { data: state, error: null }
    })
    const from = vi.fn()
    mocks.createSupabaseServerClient.mockResolvedValue({ rpc, from })

    await patchLocationSettings('loc-1', { checkout: { require_customer: true } })
    await patchLocationSettings('loc-1', { online: { reserve_inventory: true } })

    expect(state).toEqual({
      checkout: { require_customer: true },
      online: { reserve_inventory: true },
    })
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(from).not.toHaveBeenCalled()
  })

  it('invalidates the effective-settings cache after a location patch', async () => {
    const queries = {
      locations: singleQuery({ organization_id: 'org-1' }),
      location_settings: singleQuery({ settings: {} }),
      organization_settings: singleQuery({ settings: {} }),
    }
    const client = {
      from: vi.fn((table: keyof typeof queries) => queries[table]),
      rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }
    mocks.createSupabaseServerClient.mockResolvedValue(client)

    await getEffectiveSettings('loc-1')
    await patchLocationSettings('loc-1', { checkout: { require_customer: true } })
    await getEffectiveSettings('loc-1')

    expect(mocks.createSupabaseServerClient).toHaveBeenCalledTimes(3)
  })

  it('rejects unknown keys before invoking the database RPC', async () => {
    const rpc = vi.fn()
    mocks.createSupabaseServerClient.mockResolvedValue({ rpc })

    await expect(patchLocationSettings('loc-1', { unknown_setting: true }))
      .rejects.toThrow('Invalid settings patch')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('removes one validated override with an atomic JSON-null patch', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null })
    mocks.createSupabaseServerClient.mockResolvedValue({ rpc })

    await removeLocationSetting('loc-1', 'checkout.require_customer')

    expect(rpc).toHaveBeenCalledWith('patch_location_settings', {
      p_location_id: 'loc-1',
      p_patch: { checkout: { require_customer: null } },
    })
    await expect(removeLocationSetting('loc-1', 'checkout.not_real'))
      .rejects.toThrow('Invalid settings path')
    expect(rpc).toHaveBeenCalledOnce()
  })
})

function deepMerge(
  target: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...target }
  for (const [key, value] of Object.entries(patch)) {
    const current = merged[key]
    merged[key] = isObject(current) && isObject(value) ? deepMerge(current, value) : value
  }
  return merged
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
