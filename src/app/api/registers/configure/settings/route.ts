import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateSettingsSchema = z.record(z.string(), z.unknown())

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data: locationSettings, error } = await sb
      .from('location_settings')
      .select('settings')
      .eq('location_id', session.locationId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ settings: (locationSettings?.settings ?? {}) as Record<string, unknown> })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Register settings get error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = UpdateSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    // Fetch current settings
    const { data: existing, error: fetchError } = await sb
      .from('location_settings')
      .select('settings')
      .eq('location_id', session.locationId)
      .maybeSingle()

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

    const currentSettings = (existing?.settings ?? {}) as Record<string, unknown>
    const mergedSettings = { ...currentSettings, ...parsed.data }

    const { error: updateError } = await sb
      .from('location_settings')
      .upsert(
        { location_id: session.locationId, settings: mergedSettings, updated_at: new Date().toISOString() },
        { onConflict: 'location_id' }
      )

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Register settings update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
