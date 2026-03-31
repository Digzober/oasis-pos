import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getLowStockReport } from '@/lib/services/advancedReportingService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { await requireSession(); return NextResponse.json({ items: await getLowStockReport(req.nextUrl.searchParams.get('location_id')) }) }
  catch (err) { logger.error('Low stock error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
