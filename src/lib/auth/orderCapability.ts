import { createHmac, timingSafeEqual } from 'node:crypto'

const PURPOSE = 'public-order-status-and-cancellation:v1'

export function createOrderCapability(orderId: string): string {
  const secret = process.env.SESSION_SECRET
  if (!secret?.trim()) throw new Error('SESSION_SECRET environment variable is not set')
  return createHmac('sha256', secret).update(`${PURPOSE}:${orderId}`).digest('base64url')
}

export function verifyOrderCapability(orderId: string, token: string | null | undefined): boolean {
  if (!token) return false

  try {
    const expected = Buffer.from(createOrderCapability(orderId))
    const supplied = Buffer.from(token)
    return expected.length === supplied.length && timingSafeEqual(expected, supplied)
  } catch {
    return false
  }
}

export function getOrderCapability(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  return authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null
}
