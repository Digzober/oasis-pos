import { afterEach, describe, expect, it } from 'vitest'
import { POST } from '../route'

describe('Dutchie cron authorization boundary', () => {
  const originalSecret = process.env.CRON_SECRET

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalSecret
  })

  it('fails closed when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET

    const response = await POST(new Request('http://localhost/api/dutchie/cron', {
      method: 'POST',
    }) as never)

    expect(response.status).toBe(500)
  })

  it('rejects the wrong bearer token', async () => {
    process.env.CRON_SECRET = 'configured-secret'

    const response = await POST(new Request('http://localhost/api/dutchie/cron', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    }) as never)

    expect(response.status).toBe(401)
  })

  it('passes a valid bearer token through to the Phase A stub', async () => {
    process.env.CRON_SECRET = 'configured-secret'

    const response = await POST(new Request('http://localhost/api/dutchie/cron', {
      method: 'POST',
      headers: { authorization: 'Bearer configured-secret' },
    }) as never)

    expect(response.status).toBe(501)
  })
})
