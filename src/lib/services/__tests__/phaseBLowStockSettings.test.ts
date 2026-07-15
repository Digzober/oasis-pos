import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getEffectiveSettings: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

vi.mock('@/lib/settings/service', () => ({
  getEffectiveSettings: mocks.getEffectiveSettings,
}))

import { getLowStockReport } from '../advancedReportingService'

function resolvedQuery(data: unknown[]) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    then: <TResult1 = unknown, TResult2 = never>(
      onFulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
      onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve({ data, error: null }).then(onFulfilled, onRejected),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.in.mockReturnValue(query)
  return query
}

describe('low-stock setting precedence', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses product/location threshold, then effective location threshold, then 5', async () => {
    const inventory = resolvedQuery([
      { id: 'per-include', product_id: 'p1', location_id: 'loc-1', quantity: 8, quantity_reserved: 1, products: { name: 'A', sku: 'A' } },
      { id: 'per-exclude', product_id: 'p2', location_id: 'loc-1', quantity: 7, quantity_reserved: 1, products: { name: 'B', sku: 'B' } },
      { id: 'effective-include', product_id: 'p3', location_id: 'loc-1', quantity: 7, quantity_reserved: 1, products: { name: 'C', sku: 'C' } },
      { id: 'fallback-include', product_id: 'p4', location_id: 'loc-2', quantity: 5, quantity_reserved: 0, products: { name: 'D', sku: 'D' } },
      { id: 'fallback-exclude', product_id: 'p5', location_id: 'loc-2', quantity: 6, quantity_reserved: 0, products: { name: 'E', sku: 'E' } },
    ])
    const productPrices = resolvedQuery([
      { product_id: 'p1', location_id: 'loc-1', low_inventory_threshold: 8 },
      { product_id: 'p2', location_id: 'loc-1', low_inventory_threshold: 4 },
    ])
    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => table === 'inventory_items' ? inventory : productPrices),
    })
    mocks.getEffectiveSettings.mockImplementation(async (locationId: string) => locationId === 'loc-1'
      ? { inventory: { low_stock_threshold: 6 } }
      : { inventory: {} })

    const report = await getLowStockReport(null)

    expect(report.map(({ id }) => id)).toEqual([
      'per-include',
      'effective-include',
      'fallback-include',
    ])
    expect(mocks.getEffectiveSettings).toHaveBeenCalledWith('loc-1')
    expect(mocks.getEffectiveSettings).toHaveBeenCalledWith('loc-2')
  })
})
