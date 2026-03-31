import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getReferralConfig, updateReferralConfig } from '@/lib/services/referralService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try { const s = await requireSession(); return NextResponse.json({ config: await getReferralConfig(s.organizationId) }) }
  catch (err) { logger.error('Referral config error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function PUT(req: NextRequest) {
  try { const s = await requireSession(); return NextResponse.json({ config: await updateReferralConfig(s.organizationId, await req.json()) }) }
  catch (err) { logger.error('Referral config update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
