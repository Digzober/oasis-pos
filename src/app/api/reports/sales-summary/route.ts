import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getSalesSummary } from '@/lib/services/reportingService'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    await requireSession()
    const p = request.nextUrl.searchParams
    const today = new Date().toISOString().split('T')[0]!

    const summary = await getSalesSummary({
      location_id: p.get('location_id') || null,
      date_from: p.get('date_from') || today,
      date_to: p.get('date_to') || today,
    })

    return NextResponse.json(summary)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Sales summary API error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
