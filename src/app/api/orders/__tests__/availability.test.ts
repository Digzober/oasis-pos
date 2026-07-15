import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { GET } from '../route'

function locationQuery(allowsOnlineOrders: boolean) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    then: <TResult1 = unknown, TResult2 = never>(
      onFulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
      onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve({ data: [], count: 0, error: null }).then(onFulfilled, onRejected),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  query.maybeSingle.mockResolvedValue({
    data: { id: 'loc-1', allows_online_orders: allowsOnlineOrders },
    error: null,
  })
  return query
}

describe('online-order availability API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns online-ordering availability to the public storefront', async () => {
    const query = locationQuery(false)
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    const response = await GET(new NextRequest('http://localhost/api/orders?availability=true'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      location_id: 'loc-1',
      allows_online_orders: false,
    })
    expect(query.maybeSingle).toHaveBeenCalledOnce()
    expect(mocks.requireSession).not.toHaveBeenCalled()
  })
})
