import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/dutchie/sync/log
 * Returns recent dutchie_sync_log entries.
 * Filters by session location if available, otherwise returns all.
 * Supports ?limit=20 (default 20, max 100).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const url = request.nextUrl
    const limitParam = parseInt(url.searchParams.get('limit') ?? '20', 10)
    const limit = Math.min(Math.max(limitParam, 1), 100)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (sb as any).from('dutchie_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    // Only filter by location if one is selected
    if (session.locationId) {
      query = query.eq('location_id', session.locationId)
    }

    const { data: logs, error } = await query

    if (error) {
      logger.error('Dutchie sync log query error', { error: error.message })
      return NextResponse.json({ logs: [] })
    }

    return NextResponse.json({ logs: logs ?? [] })
  } catch (err) {
    // If auth fails, return empty logs instead of 500
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string }
      if (appErr.code === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
    }
    logger.error('Dutchie sync log error', { error: String(err) })
    // Return empty array instead of 500 — this is a non-critical read
    return NextResponse.json({ logs: [] })
  }
}
