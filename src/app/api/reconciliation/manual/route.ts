import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { runDailyReconciliation } from '@/lib/services/reconciliationService'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const { location_id: locationId } = await request.json() as { location_id?: string }
    if (!locationId) return NextResponse.json({ error: 'location_id required' }, { status: 400 })

    const sb = await createSupabaseServerClient()
    const { data: location } = await sb
      .from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('organization_id', session.organizationId)
      .maybeSingle()
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const report = await runDailyReconciliation(locationId, session.employeeId)
    return NextResponse.json({ report })
  } catch (err) {
    logger.error('Manual reconciliation error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
