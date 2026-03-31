import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getDashboardKPIs, getSalesByHour, getTopProducts, getPaymentBreakdown } from '@/lib/services/dashboardService'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    await requireSession()
    const p = request.nextUrl.searchParams
    const locationId = p.get('location_id') || null
    const date = p.get('date') || new Date().toISOString().slice(0, 10)

    const [kpis, salesByHour, topProducts, payments] = await Promise.all([
      getDashboardKPIs(locationId, date),
      getSalesByHour(locationId, date),
      getTopProducts(locationId, date),
      getPaymentBreakdown(locationId, date),
    ])

    return NextResponse.json({ kpis, salesByHour, topProducts, payments })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Dashboard error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
