import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listAdjustmentReasons, createAdjustmentReason } from '@/lib/services/loyaltyAdjustmentService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try { const s = await requireSession(); return NextResponse.json({ reasons: await listAdjustmentReasons(s.organizationId) }) }
  catch (err) { logger.error('Reasons error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { const s = await requireSession(); const body = await req.json(); return NextResponse.json({ reason: await createAdjustmentReason({ ...body, organization_id: s.organizationId }) }, { status: 201 }) }
  catch (err) { logger.error('Reason create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
