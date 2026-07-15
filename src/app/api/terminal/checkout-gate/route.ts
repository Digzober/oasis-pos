import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { enforceCheckoutRequirements } from '@/lib/services/checkoutGateService'
import { logger } from '@/lib/utils/logger'

const CheckoutGateSchema = z.object({
  customer_id: z.uuid().nullable(),
}).strict()

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const parsed = CheckoutGateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 },
      )
    }
    await enforceCheckoutRequirements({
      locationId: session.locationId,
      organizationId: session.organizationId,
      customerId: parsed.data.customer_id,
    })
    return NextResponse.json({ allowed: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      const message = appErr.code === 'UNAUTHORIZED' ? 'Authentication required' : appErr.message
      return NextResponse.json({ error: message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Checkout gate error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
