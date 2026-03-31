import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { runDailyReconciliation, listReports } from '@/lib/services/reconciliationService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const lid = req.nextUrl.searchParams.get('location_id') || undefined
    return NextResponse.json(await listReports(lid))
  } catch (err) { logger.error('Reconciliation list error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    // Accept both session auth and cron secret
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')
    let employeeId = ''

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      employeeId = 'system'
    } else {
      const session = await requireSession()
      employeeId = session.employeeId
    }

    const body = await req.json().catch(() => ({}))
    const locationId = body.location_id
    if (!locationId) return NextResponse.json({ error: 'location_id required' }, { status: 400 })

    const report = await runDailyReconciliation(locationId, employeeId)
    return NextResponse.json({ report })
  } catch (err) { logger.error('Reconciliation run error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
