import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getShrinkageReport } from '@/lib/services/advancedReportingService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { await requireSession(); const p = req.nextUrl.searchParams; const today = new Date().toISOString().slice(0, 10)
    return NextResponse.json(await getShrinkageReport({ date_from: p.get('date_from') ?? today, date_to: p.get('date_to') ?? today, location_id: p.get('location_id') || undefined }))
  } catch (err) { logger.error('Shrinkage error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
