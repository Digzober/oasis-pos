import { NextRequest, NextResponse } from 'next/server'
import { executeScheduledReports } from '@/lib/services/reportSchedulerService'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { const result = await executeScheduledReports(); logger.info('Scheduled reports executed', result); return NextResponse.json(result) }
  catch (err) { logger.error('Schedule execute error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
