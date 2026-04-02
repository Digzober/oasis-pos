import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DutchieClient } from '@/lib/dutchie/client'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/dutchie/test-connection
 * Tests a Dutchie API key and updates the dutchie_locations record.
 * Body: { dutchie_location_id: string } or { api_key: string }
 */

export async function POST(request: NextRequest) {
  try {
    await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()

    let apiKey = body.api_key as string | undefined
    let recordId = body.dutchie_location_id as string | undefined

    // If testing by record ID, fetch the key
    if (recordId && !apiKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (sb as any).from('dutchie_locations')
        .select('api_key')
        .eq('id', recordId)
        .single()

      if (!data?.api_key) {
        return NextResponse.json({ error: 'Dutchie location not found' }, { status: 404 })
      }
      apiKey = data.api_key
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'api_key or dutchie_location_id required' }, { status: 400 })
    }

    const client = new DutchieClient({ apiKey, locationName: 'test' })
    const whoamiResult = await client.whoami()

    // Extract only the fields we need (avoid circular ref serialization)
    const whoami = {
      LocationName: whoamiResult.LocationName,
      LocationId: whoamiResult.LocationId,
      CompanyName: whoamiResult.CompanyName,
      CompanyId: whoamiResult.CompanyId,
      valid: whoamiResult.valid,
    }

    if (!whoami.valid) {
      if (recordId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (sb as any).from('dutchie_locations')
          .update({ last_error: 'Connection test failed — invalid API key' })
          .eq('id', recordId)
      }
      return NextResponse.json({
        success: false,
        error: 'Invalid API key or connection failed',
      })
    }

    // Update the record with connection info
    if (recordId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('dutchie_locations')
        .update({
          dutchie_location_id: whoami.LocationId,
          dutchie_location_name: whoami.LocationName,
          last_connected_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', recordId)
    }

    return NextResponse.json({
      success: true,
      location_name: whoami.LocationName,
      location_id: whoami.LocationId,
      company_name: whoami.CompanyName,
      company_id: whoami.CompanyId,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }
    logger.error('Dutchie test-connection error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
