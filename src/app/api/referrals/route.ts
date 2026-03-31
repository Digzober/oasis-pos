import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createReferral } from '@/lib/services/referralService'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest) {
  try {
    const s = await requireSession(); const { referrer_id, referee_id } = await req.json()
    const referral = await createReferral(referrer_id, referee_id, s.organizationId)
    return NextResponse.json({ referral }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) { const a = err as { code: string; message: string; statusCode?: number }; return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 }) }
    logger.error('Referral create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
