import { NextRequest, NextResponse } from 'next/server'
import { requireDutchieManager } from '@/lib/auth/dutchie'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/dutchie/locations — List all Dutchie location configs
 * POST /api/dutchie/locations — Add/update a Dutchie location config
 */

export async function GET() {
  try {
    const session = await requireDutchieManager()
    const sb = await createSupabaseServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb as any).from('dutchie_locations')
      .select('id, location_id, location_name, dutchie_location_id, dutchie_location_name, is_active, last_connected_at, last_sync_at, last_error, created_at, locations!inner(organization_id)')
      .eq('locations.organization_id', session.organizationId)
      .order('location_name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const locations = (data ?? []).map(({ locations: _locations, ...location }: Record<string, unknown>) => location)
    return NextResponse.json({ locations })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message?: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED' || a.code === 'FORBIDDEN') {
        return NextResponse.json({ error: a.message ?? 'Access denied' }, { status: a.statusCode ?? 403 })
      }
    }
    logger.error('Dutchie locations GET error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireDutchieManager()
    const sb = await createSupabaseServerClient()
    const body = await request.json()

    const { location_id, api_key } = body
    const targetLocationId = location_id || session.locationId
    if (!api_key) {
      return NextResponse.json({ error: 'api_key required' }, { status: 400 })
    }

    const { data: oasisLocation, error: locationError } = await sb.from('locations')
      .select('id, name')
      .eq('id', targetLocationId)
      .eq('organization_id', session.organizationId)
      .maybeSingle()

    if (locationError) return NextResponse.json({ error: locationError.message }, { status: 500 })
    if (!oasisLocation) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb as any).from('dutchie_locations')
      .upsert({
        location_id: oasisLocation.id,
        location_name: oasisLocation.name,
        api_key,
        is_active: true,
      }, { onConflict: 'location_id' })
      .select('id, location_id, location_name, dutchie_location_id, dutchie_location_name, is_active, last_connected_at, last_sync_at, last_error, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ location: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message?: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED' || a.code === 'FORBIDDEN') {
        return NextResponse.json({ error: a.message ?? 'Access denied' }, { status: a.statusCode ?? 403 })
      }
    }
    logger.error('Dutchie locations POST error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
