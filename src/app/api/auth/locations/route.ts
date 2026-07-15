import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/lib/auth/session'
import { listAccessibleLocations } from '@/lib/settings/access'
import { logger } from '@/lib/utils/logger'

// Pre-auth consumers (terminal login) get the public picker list; authenticated
// consumers (hub, switcher, backoffice pages) get their accessible locations.
export async function GET() {
  try {
    const session = await getSession()
    if (session) {
      return NextResponse.json({ locations: await listAccessibleLocations(session) })
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { data: locations, error } = await sb
      .from('locations')
      .select('id, name, city, state')
      .eq('is_active', true)
      .order('name')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }
    return NextResponse.json({ locations: locations ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Locations list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
