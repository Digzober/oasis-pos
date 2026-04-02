import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { fetchPendingManifests } from '@/lib/biotrack/inventorySync'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const locationId = request.nextUrl.searchParams.get('location_id') ?? session.locationId

    const sb = await createSupabaseServerClient()

    // Check biotrack_config first (has the correct BioTrack location ID)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: btConfig } = await (sb as any).from('biotrack_config')
      .select('biotrack_location_id')
      .eq('location_id', locationId)
      .maybeSingle()

    // Fallback to locations table
    let biotrackLocationId = btConfig?.biotrack_location_id
    if (!biotrackLocationId) {
      const { data: location } = await sb.from('locations').select('biotrack_location_id').eq('id', locationId).single()
      biotrackLocationId = location?.biotrack_location_id
    }

    if (!biotrackLocationId) {
      return NextResponse.json({ manifests: [], message: 'No BioTrack location ID configured' })
    }

    const manifests = await fetchPendingManifests(biotrackLocationId, session.organizationId, locationId)
    return NextResponse.json({ manifests })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Manifest fetch error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
