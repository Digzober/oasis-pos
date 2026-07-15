import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/auth/session'
import { getDeliveryConfig, saveDeliveryConfig } from '@/lib/services/deliveryService'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

const deliveryConfigSchema = z.object({
  max_total_value: z.number().nonnegative().nullable().optional(),
  max_total_weight_grams: z.number().nonnegative().nullable().optional(),
}).strict()

function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Invalid delivery configuration' }, { status: 400 })
  }
  return NextResponse.json({ error: 'Server error' }, { status: 500 })
}

export async function GET() {
  try { const s = await requireSession(); return NextResponse.json({ config: await getDeliveryConfig(s.organizationId) }) }
  catch (err) { logger.error('Delivery config error', { error: String(err) }); return errorResponse(err) }
}
export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession()
    const input = deliveryConfigSchema.parse(await req.json())
    return NextResponse.json({ config: await saveDeliveryConfig(session.organizationId, input) })
  } catch (err) {
    logger.error('Delivery config update error', { error: String(err) })
    return errorResponse(err)
  }
}
