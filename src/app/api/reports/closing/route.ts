import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getClosingReport } from '@/lib/services/registerOverviewService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    const s = await requireSession()
    const p = req.nextUrl.searchParams
    const locationId = p.get('location_id') ?? s.locationId
    const today = new Date().toISOString().slice(0, 10)
    return NextResponse.json(await getClosingReport(locationId, p.get('start_date') ?? today, p.get('end_date') ?? today))
  } catch (err) { logger.error('Closing report error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
