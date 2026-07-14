import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ cancelOrder: vi.fn() }))

vi.mock('@/lib/services/onlineOrderService', () => ({
  cancelOrder: mocks.cancelOrder,
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { POST } from '../route'
import { createOrderCapability } from '@/lib/auth/orderCapability'

describe('public order cancellation capability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough'
    mocks.cancelOrder.mockResolvedValue(undefined)
  })

  it('rejects possession of an order UUID without a signed capability', async () => {
    const response = await POST(
      new Request('http://localhost/api/orders/order-public/cancel', { method: 'POST' }) as never,
      { params: Promise.resolve({ id: 'order-public' }) },
    )

    expect(response.status).toBe(404)
    expect(mocks.cancelOrder).not.toHaveBeenCalled()
  })

  it('allows the matching signed capability to cancel the order', async () => {
    const token = createOrderCapability('order-public')
    const response = await POST(
      new Request('http://localhost/api/orders/order-public/cancel', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      }) as never,
      { params: Promise.resolve({ id: 'order-public' }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.cancelOrder).toHaveBeenCalledWith('order-public')
  })
})
