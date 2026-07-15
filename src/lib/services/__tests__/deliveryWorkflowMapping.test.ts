import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  applyOrderStatusToGuestlist: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('@/lib/guestlist/workflowMappings', () => ({
  applyOrderStatusToGuestlist: mocks.applyOrderStatusToGuestlist,
}))
vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { assignDriverToOrder } from '../deliveryService'

describe('delivery guestlist workflow transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.applyOrderStatusToGuestlist.mockResolvedValue(true)
  })

  it('applies out-for-delivery mapping after driver assignment succeeds', async () => {
    const result = { data: { location_id: 'location-1' }, error: null }
    const query = {
      update: vi.fn(() => query), eq: vi.fn(() => query), select: vi.fn(() => query),
      single: vi.fn().mockResolvedValue(result),
    }
    const client = { from: vi.fn(() => query) }
    mocks.createSupabaseServerClient.mockResolvedValue(client)

    await assignDriverToOrder('order-1', 'driver-1')

    expect(mocks.applyOrderStatusToGuestlist).toHaveBeenCalledWith(
      'order-1', 'location-1', 'out_for_delivery', client,
    )
  })

  it('does not move the queue when driver assignment fails', async () => {
    const query = {
      update: vi.fn(() => query), eq: vi.fn(() => query), select: vi.fn(() => query),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }),
    }
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    await expect(assignDriverToOrder('order-1', 'driver-1')).rejects.toThrow('update failed')
    expect(mocks.applyOrderStatusToGuestlist).not.toHaveBeenCalled()
  })
})
