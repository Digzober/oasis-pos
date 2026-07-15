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

import { placeOrder } from '../onlineOrderService'

const NOW = new Date('2026-07-14T18:00:00.000Z')

function createOrderInput(pickupTime: string) {
  return {
    location_id: 'loc-1',
    customer_name: 'Ada Lovelace',
    customer_phone: '5055550100',
    customer_email: null,
    pickup_time: pickupTime,
    items: [{ product_id: 'product-1', quantity: 2 }],
    notes: null,
    order_type: 'pickup' as const,
  }
}

function createOrderClient(allowsOnlineOrders = true) {
  const inventoryUpdates: Array<Record<string, unknown>> = []

  function query(table: string) {
    let operation: 'select' | 'insert' | 'update' = 'select'
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gt: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn(() => builder),
      insert: vi.fn(() => { operation = 'insert'; return builder }),
      update: vi.fn((payload: Record<string, unknown>) => {
        operation = 'update'
        if (table === 'inventory_items') inventoryUpdates.push(payload)
        return builder
      }),
      single: vi.fn(async () => {
        if (table === 'online_orders' && operation === 'insert') {
          return { data: { id: 'order-1' }, error: null }
        }
        return { data: null, error: null }
      }),
      maybeSingle: vi.fn(async () => table === 'locations'
        ? { data: { allows_online_orders: allowsOnlineOrders }, error: null }
        : { data: null, error: null }),
      then: <TResult1 = unknown, TResult2 = never>(
        onFulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
        onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => Promise.resolve(result()).then(onFulfilled, onRejected),
    }

    function result() {
      if (table === 'products') {
        return { data: [{ id: 'product-1', name: 'Blue Dream', rec_price: 20, is_active: true }], error: null }
      }
      if (table === 'inventory_items' && operation === 'select') {
        return { data: [{ id: 'inventory-1', quantity: 10, quantity_reserved: 1 }], error: null }
      }
      return { data: null, error: null }
    }

    return builder
  }

  return {
    client: { from: vi.fn(query) },
    inventoryUpdates,
  }
}

describe('online order settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    mocks.getEffectiveSettings.mockResolvedValue({
      online: {
        reserve_inventory: false,
        pickup_window_minutes: 30,
        max_advance_order_days: 1,
      },
    })
  })

  it('rejects order creation when the location disables online ordering', async () => {
    const { client } = createOrderClient(false)
    mocks.createSupabaseServerClient.mockResolvedValue(client)

    await expect(placeOrder(createOrderInput('2026-07-14T19:00:00.000Z')))
      .rejects.toMatchObject({ code: 'ONLINE_ORDERING_DISABLED', statusCode: 403 })
  })

  it('rejects pickup times inside the configured preparation window', async () => {
    const { client } = createOrderClient()
    mocks.createSupabaseServerClient.mockResolvedValue(client)

    await expect(placeOrder(createOrderInput('2026-07-14T18:15:00.000Z')))
      .rejects.toMatchObject({ code: 'INVALID_TIME', statusCode: 400 })
  })

  it('rejects pickup times beyond the configured advance-order limit', async () => {
    const { client } = createOrderClient()
    mocks.createSupabaseServerClient.mockResolvedValue(client)

    await expect(placeOrder(createOrderInput('2026-07-16T18:00:00.000Z')))
      .rejects.toMatchObject({ code: 'INVALID_TIME', statusCode: 400 })
  })

  it('rejects an invalid pickup timestamp', async () => {
    const { client } = createOrderClient()
    mocks.createSupabaseServerClient.mockResolvedValue(client)

    await expect(placeOrder(createOrderInput('not-a-timestamp')))
      .rejects.toMatchObject({ code: 'INVALID_TIME', statusCode: 400 })
  })

  it('does not reserve inventory when effective settings disable reservations', async () => {
    const { client, inventoryUpdates } = createOrderClient()
    mocks.createSupabaseServerClient.mockResolvedValue(client)

    await placeOrder(createOrderInput('2026-07-14T19:00:00.000Z'))

    expect(inventoryUpdates).toEqual([])
  })

  it('reserves inventory when effective settings enable reservations', async () => {
    const { client, inventoryUpdates } = createOrderClient()
    mocks.createSupabaseServerClient.mockResolvedValue(client)
    mocks.getEffectiveSettings.mockResolvedValue({
      online: {
        reserve_inventory: true,
        pickup_window_minutes: 30,
        max_advance_order_days: 1,
      },
    })

    await placeOrder(createOrderInput('2026-07-14T19:00:00.000Z'))

    expect(inventoryUpdates).toEqual([{ quantity_reserved: 3 }])
    expect(mocks.getEffectiveSettings).toHaveBeenCalledWith('loc-1')
  })
})
