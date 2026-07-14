import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { seedBioTrackConfig, clearBioTrackConfigCache } from '@/lib/biotrack/configLoader'
import { logger } from '@/lib/utils/logger'
import { requireSession, type SessionPayload } from '@/lib/auth/session'
import { AppError } from '@/lib/utils/errors'

async function requireBioTrackAdmin(): Promise<SessionPayload> {
  const session = await requireSession()
  if (session.role !== 'admin' && session.role !== 'owner') {
    throw new AppError('FORBIDDEN', 'Administrator access required', undefined, 403)
  }
  return session
}

function authError(err: unknown): NextResponse | null {
  if (err && typeof err === 'object' && 'code' in err) {
    const appErr = err as { message?: string; statusCode?: number }
    return NextResponse.json({ error: appErr.message ?? 'Access denied' }, { status: appErr.statusCode ?? 500 })
  }
  return null
}

/**
 * GET /api/biotrack/config?locationId=xxx
 * Returns the BioTrack config for a location (credentials redacted).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')

  if (!locationId) {
    return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
  }

  try {
    const session = await requireBioTrackAdmin()
    const sb = await createSupabaseServerClient()
    const { data, error } = await sb
      .from('biotrack_config')
      .select('location_id, xml_api_url, rest_api_url, ubi, biotrack_location_id, use_training_mode, use_allotment_check, use_lab_data, default_labs_in_receive, locations!inner(organization_id)')
      .eq('location_id', locationId)
      .eq('locations.organization_id', session.organizationId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'No config found for this location' }, { status: 404 })
    }

    const { locations: _locations, ...safe } = data
    return NextResponse.json({ config: safe })
  } catch (err) {
    const response = authError(err)
    if (response) return response
    logger.error('Failed to get BioTrack config', { locationId, error: String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/biotrack/config
 * Creates or updates BioTrack config for a location.
 * Body: { locationId, xmlApiUrl, restApiUrl, username, password, ubi, ...toggles }
 */
export async function POST(request: Request) {
  try {
    const session = await requireBioTrackAdmin()
    const body = await request.json()

    const { locationId, xmlApiUrl, restApiUrl, username, password, ubi, ...toggles } = body

    if (!locationId || !restApiUrl || !username || !password) {
      return NextResponse.json(
        { error: 'locationId, restApiUrl, username, and password are required' },
        { status: 400 },
      )
    }

    const sb = await createSupabaseServerClient()
    const { data: location, error: locationError } = await sb.from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('organization_id', session.organizationId)
      .maybeSingle()

    if (locationError) return NextResponse.json({ error: locationError.message }, { status: 500 })
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    await seedBioTrackConfig({
      locationId,
      xmlApiUrl: xmlApiUrl ?? '',
      restApiUrl,
      username,
      password,
      ubi: ubi ?? '',
      biotrackLocationId: toggles.biotrackLocationId ?? '',
      useTrainingMode: toggles.useTrainingMode,
      useAllotmentCheck: toggles.useAllotmentCheck,
      useLabData: toggles.useLabData,
      defaultLabsInReceive: toggles.defaultLabsInReceive,
    })

    return NextResponse.json({ success: true, message: 'BioTrack config saved' })
  } catch (err) {
    const response = authError(err)
    if (response) return response
    logger.error('Failed to save BioTrack config', { error: String(err) })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * DELETE /api/biotrack/config?locationId=xxx
 * Clears the config cache for a location (does not delete the DB record).
 */
export async function DELETE(request: Request) {
  try {
    const session = await requireBioTrackAdmin()
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    if (!locationId) return NextResponse.json({ error: 'locationId is required' }, { status: 400 })

    const sb = await createSupabaseServerClient()
    const { data: location } = await sb.from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('organization_id', session.organizationId)
      .maybeSingle()

    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    clearBioTrackConfigCache(locationId)
    return NextResponse.json({ success: true, message: 'Cache cleared' })
  } catch (err) {
    const response = authError(err)
    if (response) return response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
