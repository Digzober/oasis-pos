import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getInventoryValuationReport } from '@/lib/services/advancedReportingService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { await requireSession(); return NextResponse.json(await getInventoryValuationReport(req.nextUrl.searchParams.get('location_id'))) }
  catch (err) { logger.error('Valuation error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
