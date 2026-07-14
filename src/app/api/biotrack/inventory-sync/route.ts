import { NextRequest, NextResponse } from 'next/server'
import { pullAllLocations } from '@/lib/biotrack/inventoryPull'
import { logger } from '@/lib/utils/logger'
import { enforceCronSecret } from '@/lib/auth/cron'

export async function POST(request: NextRequest) {
  const authError = enforceCronSecret(request)
  if (authError) return authError

  try {
    const count = await pullAllLocations()
    logger.info('Inventory sync complete', { locations: count })
    return NextResponse.json({ locations_synced: count })
  } catch (err) { logger.error('Inventory sync error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
