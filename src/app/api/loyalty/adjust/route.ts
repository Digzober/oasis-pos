import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { adjustLoyaltyPoints } from '@/lib/services/loyaltyAdjustmentService'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest) {
  try {
    const s = await requireSession(); const body = await req.json()
    await adjustLoyaltyPoints(body.customer_id, body.points, body.reason_id, body.notes ?? '', s.employeeId, s.organizationId)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) { const a = err as { code: string; message: string; statusCode?: number }; return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 }) }
    logger.error('Loyalty adjust error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
