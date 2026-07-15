import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  applyOrderStatusToGuestlist: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('@/lib/guestlist/workflowMappings', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/guestlist/workflowMappings')>()
  return { ...original, applyOrderStatusToGuestlist: mocks.applyOrderStatusToGuestlist }
})
vi.mock('@/lib/settings/service', () => ({ getEffectiveSettings: vi.fn() }))
vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { cancelOrder, releaseExpiredReservations, updateOrderStatus } from '../onlineOrderService'

describe('online order guestlist workflow transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.applyOrderStatusToGuestlist.mockResolvedValue(true)
  })

  it('applies the mapped guestlist status after the online order update succeeds', async () => {
    const client = createOrderClient({ updateError: null })
    mocks.createSupabaseServerClient.mockResolvedValue(client)

    await updateOrderStatus('order-1', 'ready', 'org-1')

    expect(mocks.applyOrderStatusToGuestlist).toHaveBeenCalledWith(
      'order-1',
      'location-1',
      'ready',
      client,
    )
  })

  it('propagates the online order update error without changing the queue', async () => {
    mocks.createSupabaseServerClient.mockResolvedValue(createOrderClient({
      updateError: { message: 'order update failed' },
    }))

    await expect(updateOrderStatus('order-1', 'ready', 'org-1'))
      .rejects.toThrow('order update failed')
    expect(mocks.applyOrderStatusToGuestlist).not.toHaveBeenCalled()
  })

  it('applies the cancelled mapping after an explicit cancellation', async () => {
    const client = createCancellationClient()
    mocks.createSupabaseServerClient.mockResolvedValue(client)

    await cancelOrder('order-1')

    expect(mocks.applyOrderStatusToGuestlist).toHaveBeenCalledWith(
      'order-1', 'location-1', 'cancelled', client,
    )
  })

  it('applies the cancelled mapping when reservations expire', async () => {
    const client = createExpirationClient()
    mocks.createSupabaseServerClient.mockResolvedValue(client)

    await expect(releaseExpiredReservations()).resolves.toBe(1)
    expect(mocks.applyOrderStatusToGuestlist).toHaveBeenCalledWith(
      'order-expired', 'location-1', 'cancelled', client,
    )
  })
})

function createOrderClient({ updateError }: { updateError: { message: string } | null }) {
  let call = 0
  return {
    from: vi.fn(() => {
      call += 1
      const result = call === 1
        ? { data: { id: 'order-1', location_id: 'location-1' }, error: null }
        : { data: null, error: updateError }
      const query = {
        select: vi.fn(() => query),
        update: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(() => Promise.resolve(result)),
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      }
      return query
    }),
  }
}

function createCancellationClient() {
  let onlineOrderCalls = 0
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'online_orders') onlineOrderCalls += 1
      const result = table === 'online_order_lines'
        ? { data: [], error: null }
        : onlineOrderCalls === 1
          ? { data: { id: 'order-1', status: 'pending', location_id: 'location-1' }, error: null }
          : { data: null, error: null }
      const query = chain(result)
      return query
    }),
  }
  return client
}

function createExpirationClient() {
  let onlineOrderCalls = 0
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'online_orders') onlineOrderCalls += 1
      const result = onlineOrderCalls === 1
        ? { data: [{ id: 'order-expired', location_id: 'location-1', online_order_lines: [] }], error: null }
        : { data: null, error: null }
      return chain(result)
    }),
  }
  return client
}

function chain(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query), update: vi.fn(() => query), eq: vi.fn(() => query),
    lt: vi.fn(() => query), gt: vi.fn(() => query), order: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
  return query
}
