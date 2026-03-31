import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getRegisterOverview } from '@/lib/services/registerOverviewService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    const s = await requireSession()
    const p = req.nextUrl.searchParams
    const locationId = p.get('location_id') ?? s.locationId
    const date = p.get('date') ?? new Date().toISOString().slice(0, 10)
    return NextResponse.json(await getRegisterOverview(locationId, date))
  } catch (err) { logger.error('Register overview error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
