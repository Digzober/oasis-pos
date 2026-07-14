import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getOrderStatus: vi.fn() }))

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn().mockResolvedValue(null),
  requireSession: vi.fn(),
}))

vi.mock('@/lib/auth/ownership', () => ({
  assertOrgOwnership: vi.fn(),
}))

vi.mock('@/lib/services/onlineOrderService', () => ({
  getOrderStatus: mocks.getOrderStatus,
  updateOrderStatus: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '../route'
import { createOrderCapability } from '@/lib/auth/orderCapability'

describe('public order status capability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough'
    mocks.getOrderStatus.mockResolvedValue({ id: 'order-public', status: 'pending' })
  })

  it('does not disclose order detail to UUID-only callers', async () => {
    const response = await GET(
      new Request('http://localhost/api/orders/order-public') as never,
      { params: Promise.resolve({ id: 'order-public' }) },
    )

    expect(response.status).toBe(404)
    expect(mocks.getOrderStatus).not.toHaveBeenCalled()
  })

  it('returns status for the matching signed capability', async () => {
    const token = createOrderCapability('order-public')
    const response = await GET(
      new Request('http://localhost/api/orders/order-public', {
        headers: { authorization: `Bearer ${token}` },
      }) as never,
      { params: Promise.resolve({ id: 'order-public' }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.getOrderStatus).toHaveBeenCalledWith('order-public')
  })
})
