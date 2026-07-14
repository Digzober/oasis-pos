import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { runDailyReconciliation, listReports } from '@/lib/services/reconciliationService'
import { logger } from '@/lib/utils/logger'
import { enforceCronSecret } from '@/lib/auth/cron'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const lid = req.nextUrl.searchParams.get('location_id') || undefined
    return NextResponse.json(await listReports(session.organizationId, lid))
  } catch (err) { logger.error('Reconciliation list error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const authError = enforceCronSecret(req)
    if (authError) return authError

    const body = await req.json().catch(() => ({}))
    const locationId = body.location_id
    if (!locationId) return NextResponse.json({ error: 'location_id required' }, { status: 400 })

    const report = await runDailyReconciliation(locationId, 'system')
    return NextResponse.json({ report })
  } catch (err) { logger.error('Reconciliation run error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
