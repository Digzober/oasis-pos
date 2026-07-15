import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { updateZone } from '@/lib/services/deliveryService'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

const updateZoneSchema = z.object({
  name: z.string().trim().min(1).optional(),
  delivery_fee: z.number().nonnegative().optional(),
  min_order: z.number().nonnegative().nullable().optional(),
  boundaries: z.unknown().nullable().optional(),
  is_active: z.boolean().optional(),
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('delivery_zones', id, session.organizationId)) return NextResponse.json({ error: 'Zone not found' }, { status: 404 }); const input = updateZoneSchema.parse(await req.json()); return NextResponse.json({ zone: await updateZone(id, input) }) }
  catch (err) { logger.error('Zone update error', { error: String(err) }); return errorResponse(err) }
}
