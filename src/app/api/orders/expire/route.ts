import { NextRequest, NextResponse } from 'next/server'
import { releaseExpiredReservations } from '@/lib/services/onlineOrderService'
import { logger } from '@/lib/utils/logger'
import { enforceCronSecret } from '@/lib/auth/cron'

export async function POST(request: NextRequest) {
  const authError = enforceCronSecret(request)
  if (authError) return authError

  try {
    const count = await releaseExpiredReservations()
    logger.info('Expired orders processed', { count })
    return NextResponse.json({ expired_count: count })
  } catch (err) { logger.error('Expire error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
