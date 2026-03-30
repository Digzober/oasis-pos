import { NextRequest, NextResponse } from 'next/server'
import { releaseExpiredReservations } from '@/lib/services/onlineOrderService'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const count = await releaseExpiredReservations()
    logger.info('Expired orders processed', { count })
    return NextResponse.json({ expired_count: count })
  } catch (err) { logger.error('Expire error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
