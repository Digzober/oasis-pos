import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/dutchie/jobs — List recent sync jobs with optional location filter
 */

export async function GET(request: NextRequest) {
  try {
    await requireSession()
    const sb = await createSupabaseServerClient()

    const locationId = request.nextUrl.searchParams.get('location_id')
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50'), 100)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (sb as any).from('dutchie_sync_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ jobs: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }
    logger.error('Dutchie jobs GET error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
