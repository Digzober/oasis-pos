import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { seedBioTrackConfig, clearBioTrackConfigCache } from '@/lib/biotrack/configLoader'
import { logger } from '@/lib/utils/logger'

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
    const sb = await createSupabaseServerClient()
    const { data, error } = await sb
      .from('biotrack_config')
      .select('*')
      .eq('location_id', locationId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'No config found for this location' }, { status: 404 })
    }

    // Redact credentials in response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safe = { ...(data as any) }
    if (safe.username_encrypted) safe.username_encrypted = '***'
    if (safe.password_encrypted) safe.password_encrypted = '***'

    return NextResponse.json({ config: safe })
  } catch (err) {
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
    const body = await request.json()

    const { locationId, xmlApiUrl, restApiUrl, username, password, ubi, ...toggles } = body

    if (!locationId || !restApiUrl || !username || !password) {
      return NextResponse.json(
        { error: 'locationId, restApiUrl, username, and password are required' },
        { status: 400 },
      )
    }

    await seedBioTrackConfig({
      locationId,
      xmlApiUrl: xmlApiUrl ?? '',
      restApiUrl,
      username,
      password,
      ubi: ubi ?? '',
      useTrainingMode: toggles.useTrainingMode,
      useAllotmentCheck: toggles.useAllotmentCheck,
      useLabData: toggles.useLabData,
      defaultLabsInReceive: toggles.defaultLabsInReceive,
    })

    return NextResponse.json({ success: true, message: 'BioTrack config saved' })
  } catch (err) {
    logger.error('Failed to save BioTrack config', { error: String(err) })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * DELETE /api/biotrack/config?locationId=xxx
 * Clears the config cache for a location (does not delete the DB record).
 */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')

  clearBioTrackConfigCache(locationId ?? undefined)
  return NextResponse.json({ success: true, message: 'Cache cleared' })
}
