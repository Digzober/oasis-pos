import { NextRequest, NextResponse } from 'next/server'
import { requireDutchieManager } from '@/lib/auth/dutchie'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/dutchie/jobs — List recent sync jobs with optional location filter
 */

export async function GET(request: NextRequest) {
  try {
    const session = await requireDutchieManager()
    const sb = await createSupabaseServerClient()

    const locationId = request.nextUrl.searchParams.get('location_id')
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50'), 100)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (sb as any).from('dutchie_sync_jobs')
      .select('*, locations!inner(organization_id)')
      .eq('locations.organization_id', session.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const jobs = (data ?? []).map(({ locations: _locations, ...job }: Record<string, unknown>) => job)
    return NextResponse.json({ jobs })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message?: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED' || a.code === 'FORBIDDEN') {
        return NextResponse.json({ error: a.message ?? 'Access denied' }, { status: a.statusCode ?? 403 })
      }
    }
    logger.error('Dutchie jobs GET error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
