import { NextRequest, NextResponse } from 'next/server'
import { executeScheduledReports } from '@/lib/services/reportSchedulerService'
import { logger } from '@/lib/utils/logger'
import { enforceCronSecret } from '@/lib/auth/cron'

export async function POST(request: NextRequest) {
  const authError = enforceCronSecret(request)
  if (authError) return authError
  try { const result = await executeScheduledReports(); logger.info('Scheduled reports executed', result); return NextResponse.json(result) }
  catch (err) { logger.error('Schedule execute error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
