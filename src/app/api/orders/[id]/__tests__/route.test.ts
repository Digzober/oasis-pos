import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  assertOrgOwnership: vi.fn(),
  getOrderStatus: vi.fn(),
  requireSession: vi.fn(),
  updateOrderStatus: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn().mockResolvedValue(null),
  requireSession: mocks.requireSession,
}))

vi.mock('@/lib/auth/ownership', () => ({
  assertOrgOwnership: mocks.assertOrgOwnership,
}))

vi.mock('@/lib/services/onlineOrderService', () => ({
  getOrderStatus: mocks.getOrderStatus,
  updateOrderStatus: mocks.updateOrderStatus,
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET, PATCH } from '../route'
import { createOrderCapability } from '@/lib/auth/orderCapability'

describe('public order status capability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough'
    mocks.getOrderStatus.mockResolvedValue({ id: 'order-public', status: 'pending' })
    mocks.requireSession.mockResolvedValue({ organizationId: 'org-1' })
    mocks.assertOrgOwnership.mockResolvedValue(true)
    mocks.updateOrderStatus.mockResolvedValue(undefined)
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

  it('rejects unknown order statuses before writing', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/orders/order-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'invented' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )

    expect(response.status).toBe(400)
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled()
  })

  it('passes an approved status to the workflow-aware service', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/orders/order-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'out_for_delivery' }),
      }) as never,
      { params: Promise.resolve({ id: 'order-1' }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith('order-1', 'out_for_delivery', 'org-1')
  })
})
