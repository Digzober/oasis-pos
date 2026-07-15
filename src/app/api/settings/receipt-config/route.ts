import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { requireAccessibleLocation } from '@/lib/settings/access'
import {
  flattenReceiptConfig,
  getReceiptConfig,
  patchReceiptConfig,
} from '@/lib/receipts/config'
import { logger } from '@/lib/utils/logger'

const PatchRequestSchema = z.object({
  location_id: z.uuid().optional(),
  patch: z.unknown(),
}).strict()

function errorResponse(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const appError = error as { code: string; message: string; statusCode?: number }
    return NextResponse.json({ error: appError.message }, { status: appError.statusCode ?? 500 })
  }
  logger.error('Receipt config API error', { error: String(error) })
  return NextResponse.json({ error: 'Server error' }, { status: 500 })
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const locationId = request.nextUrl.searchParams.get('location_id') ?? session.locationId
    await requireAccessibleLocation(session, locationId)
    const config = await getReceiptConfig(locationId)
    return NextResponse.json({ config, settings: flattenReceiptConfig(config) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const parsed = PatchRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }
    const locationId = parsed.data.location_id ?? session.locationId
    await requireAccessibleLocation(session, locationId)
    const config = await patchReceiptConfig(locationId, parsed.data.patch)
    return NextResponse.json({ config, settings: flattenReceiptConfig(config) })
  } catch (error) {
    return errorResponse(error)
  }
}
