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
    const { data: location } = await sb.from('locations').select('biotrack_location_id').eq('id', locationId).single()

    if (!location?.biotrack_location_id) {
      return NextResponse.json({ manifests: [], message: 'No BioTrack location ID configured' })
    }

    const manifests = await fetchPendingManifests(location.biotrack_location_id, session.organizationId)
    return NextResponse.json({ manifests })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Manifest fetch error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
