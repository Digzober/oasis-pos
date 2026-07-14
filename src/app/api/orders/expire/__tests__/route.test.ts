import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const releaseExpiredReservations = vi.hoisted(() => vi.fn())

vi.mock('@/lib/services/onlineOrderService', () => ({ releaseExpiredReservations }))

import { POST } from '../route'

describe('orders expiration cron authorization', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    releaseExpiredReservations.mockResolvedValue(2)
  })

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalSecret
  })

  it('refuses to run when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET

    const response = await POST(new Request('http://localhost/api/orders/expire', {
      method: 'POST',
    }) as never)

    expect(response.status).toBe(500)
    expect(releaseExpiredReservations).not.toHaveBeenCalled()
  })

  it('rejects a missing or incorrect bearer token', async () => {
    process.env.CRON_SECRET = 'configured-secret'

    const response = await POST(new Request('http://localhost/api/orders/expire', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    }) as never)

    expect(response.status).toBe(401)
    expect(releaseExpiredReservations).not.toHaveBeenCalled()
  })

  it('runs with the configured bearer token', async () => {
    process.env.CRON_SECRET = 'configured-secret'

    const response = await POST(new Request('http://localhost/api/orders/expire', {
      method: 'POST',
      headers: { authorization: 'Bearer configured-secret' },
    }) as never)

    expect(response.status).toBe(200)
    expect(releaseExpiredReservations).toHaveBeenCalledOnce()
  })
})
