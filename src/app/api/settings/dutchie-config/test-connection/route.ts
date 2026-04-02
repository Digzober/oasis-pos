import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DutchieClient } from '@/lib/dutchie/client'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/settings/dutchie-config/test-connection
 * Loads API key from dutchie_config for the session's location,
 * calls DutchieClient.whoami(), returns success/failure.
 * On success, updates dutchie_location_name and dutchie_location_id in config.
 */
export async function POST() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (sb as any).from('dutchie_config')
      .select('*')
      .eq('location_id', session.locationId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!row) {
      return NextResponse.json({
        error: 'No Dutchie configuration found for this location. Save your settings first.',
      }, { status: 404 })
    }

    const apiKey = row.api_key_encrypted as string
    if (!apiKey) {
      return NextResponse.json({
        error: 'No API key configured. Enter and save your API key first.',
      }, { status: 400 })
    }

    const client = new DutchieClient(apiKey)
    const whoami = await client.whoami()

    if (!whoami.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key or connection failed',
      })
    }

    // Update config with location info from Dutchie
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any).from('dutchie_config')
      .update({
        dutchie_location_name: whoami.locationName,
        dutchie_location_id: String(whoami.locationId),
        updated_at: new Date().toISOString(),
      })
      .eq('location_id', session.locationId)

    logger.info('Dutchie connection test success', {
      locationId: session.locationId,
      dutchieLocationName: whoami.locationName,
      dutchieLocationId: whoami.locationId,
    })

    return NextResponse.json({
      success: true,
      locationName: whoami.locationName,
      locationId: whoami.locationId,
      companyName: whoami.companyName,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Dutchie connection test error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
