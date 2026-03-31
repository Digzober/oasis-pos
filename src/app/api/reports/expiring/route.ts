import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getExpiringInventoryReport } from '@/lib/services/advancedReportingService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { await requireSession(); const p = req.nextUrl.searchParams
    return NextResponse.json({ items: await getExpiringInventoryReport(p.get('location_id'), Number(p.get('window_days') ?? 30)) })
  } catch (err) { logger.error('Expiring error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
