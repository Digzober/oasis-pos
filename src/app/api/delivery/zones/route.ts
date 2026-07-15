import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/auth/session'
import { listZones, createZone } from '@/lib/services/deliveryService'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

const createZoneSchema = z.object({
  name: z.string().trim().min(1),
  delivery_fee: z.number().nonnegative().optional(),
  min_order: z.number().nonnegative().nullable().optional(),
  boundaries: z.unknown().nullable().optional(),
  is_active: z.boolean().optional(),
  organization_id: z.string().optional(),
}).strict()

function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Invalid delivery zone' }, { status: 400 })
  }
  return NextResponse.json({ error: 'Server error' }, { status: 500 })
}

export async function GET(req: NextRequest) {
  try { const s = await requireSession(); return NextResponse.json({ zones: await listZones(s.organizationId) }) }
  catch (err) { logger.error('Zones error', { error: String(err) }); return errorResponse(err) }
}
export async function POST(req: NextRequest) {
  try { const session = await requireSession(); const body = createZoneSchema.parse(await req.json()); const input = { ...body, organization_id: session.organizationId }; return NextResponse.json({ zone: await createZone(input) }, { status: 201 }) }
  catch (err) { logger.error('Zone create error', { error: String(err) }); return errorResponse(err) }
}
