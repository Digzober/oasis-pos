import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import {
  DEFAULT_RECEIPT_CONFIG,
  flattenReceiptConfig,
  getReceiptConfig,
  patchReceiptConfig,
} from '../config'

function receiptQuery(data: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}

describe('receipt config', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns code defaults when a location has no receipt_config row', async () => {
    const query = receiptQuery(null)
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    await expect(getReceiptConfig('loc-1')).resolves.toEqual(DEFAULT_RECEIPT_CONFIG)
    expect(query.eq).toHaveBeenNthCalledWith(1, 'location_id', 'loc-1')
    expect(query.eq).toHaveBeenNthCalledWith(2, 'config_type', 'receipt')
  })

  it('deeply fills missing stored values from receipt defaults', async () => {
    const query = receiptQuery({
      header_config: { show_location_name: false },
      line_item_config: {},
      footer_config: { show_return_policy: false },
      additional_config: {},
    })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    const config = await getReceiptConfig('loc-1')

    expect(config.header_config.show_location_name).toBe(false)
    expect(config.header_config.show_location_address).toBe(true)
    expect(config.footer_config.show_return_policy).toBe(false)
  })

  it('atomically patches one validated receipt key', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        header_config: DEFAULT_RECEIPT_CONFIG.header_config,
        line_item_config: {
          ...DEFAULT_RECEIPT_CONFIG.line_item_config,
          show_sku: false,
        },
        footer_config: DEFAULT_RECEIPT_CONFIG.footer_config,
        additional_config: DEFAULT_RECEIPT_CONFIG.additional_config,
      },
      error: null,
    })
    mocks.createSupabaseServerClient.mockResolvedValue({ rpc })

    const result = await patchReceiptConfig('loc-1', {
      line_item_config: { show_sku: false },
    })

    expect(rpc).toHaveBeenCalledWith('patch_receipt_config', {
      p_location_id: 'loc-1',
      p_patch: { line_item_config: { show_sku: false } },
    })
    expect(flattenReceiptConfig(result).show_sku).toBe(false)
  })

  it('rejects unknown receipt keys before calling the RPC', async () => {
    const rpc = vi.fn()
    mocks.createSupabaseServerClient.mockResolvedValue({ rpc })

    await expect(patchReceiptConfig('loc-1', {
      line_item_config: { decorative_setting: true },
    })).rejects.toThrow('Invalid receipt config patch')
    expect(rpc).not.toHaveBeenCalled()
  })
})
