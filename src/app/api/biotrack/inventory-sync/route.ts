import { NextRequest, NextResponse } from 'next/server'
import { pullAllLocations } from '@/lib/biotrack/inventoryPull'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const count = await pullAllLocations()
    logger.info('Inventory sync complete', { locations: count })
    return NextResponse.json({ locations_synced: count })
  } catch (err) { logger.error('Inventory sync error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
