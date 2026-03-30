import { NextRequest, NextResponse } from 'next/server'
import { processBioTrackRetryQueue } from '@/lib/biotrack/retryQueue'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  // Protect with cron secret or API key
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processBioTrackRetryQueue()
    logger.info('BioTrack retry queue processed', result)
    return NextResponse.json(result)
  } catch (err) {
    logger.error('BioTrack retry queue error', { error: String(err) })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
