import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/dutchie/locations — List all Dutchie location configs
 * POST /api/dutchie/locations — Add/update a Dutchie location config
 */

export async function GET() {
  try {
    await requireSession()
    const sb = await createSupabaseServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb as any).from('dutchie_locations')
      .select('id, location_id, location_name, dutchie_location_id, dutchie_location_name, is_active, last_connected_at, last_sync_at, last_error, created_at')
      .order('location_name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ locations: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }
    logger.error('Dutchie locations GET error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()

    const { location_id, location_name, api_key } = body
    if (!location_name || !api_key) {
      return NextResponse.json({ error: 'location_name and api_key required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb as any).from('dutchie_locations')
      .upsert({
        location_id: location_id || null,
        location_name,
        api_key,
        is_active: true,
      }, { onConflict: 'location_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ location: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }
    logger.error('Dutchie locations POST error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
