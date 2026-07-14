import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DutchieClient } from '@/lib/dutchie/client'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/dutchie/test-connection
 * Tests a Dutchie API key via /whoami.
 * Body: { api_key: string }
 */

export async function POST(request: NextRequest) {
  try {
    await requireSession()
    const body = await request.json()
    const apiKey = body.api_key as string | undefined

    if (!apiKey) {
      return NextResponse.json({ error: 'api_key required' }, { status: 400 })
    }

    const client = new DutchieClient(apiKey)
    const whoami = await client.whoami()

    if (!whoami.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key or connection failed',
      })
    }

    return NextResponse.json({
      success: true,
      location_name: whoami.locationName,
      location_id: whoami.locationId,
      company_name: whoami.companyName,
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
