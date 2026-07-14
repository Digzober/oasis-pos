import { NextRequest, NextResponse } from 'next/server'
import { processBioTrackRetryQueue } from '@/lib/biotrack/retryQueue'
import { logger } from '@/lib/utils/logger'
import { enforceCronSecret } from '@/lib/auth/cron'

export async function POST(request: NextRequest) {
  const authError = enforceCronSecret(request)
  if (authError) return authError

  try {
    const result = await processBioTrackRetryQueue()
    logger.info('BioTrack retry queue processed', result)
    return NextResponse.json(result)
  } catch (err) {
    logger.error('BioTrack retry queue error', { error: String(err) })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
