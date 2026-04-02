import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateSchema = z.object({
  pos: z.record(z.string(), z.string()).optional(),
  backend: z.record(z.string(), z.string()).optional(),
  prescription: z.record(z.string(), z.string()).optional(),
})

export async function GET() {
  try {
    const session = await requireSession()

    const sb = await createSupabaseServerClient()
    const { data, error } = await sb
      .from('location_settings')
      .select('settings')
      .eq('location_id', session.locationId)
      .single()
    if (error) throw error

    const settings = (data?.settings ?? {}) as Record<string, unknown>
    return NextResponse.json({ fields: settings.customer_field_visibility ?? {} })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Customer fields get error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })

    const sb = await createSupabaseServerClient()
    const { data: current, error: fetchError } = await sb
      .from('location_settings')
      .select('settings')
      .eq('location_id', session.locationId)
      .single()
    if (fetchError) throw fetchError

    const settings = (current?.settings ?? {}) as Record<string, unknown>
    const existing = (settings.customer_field_visibility ?? {}) as Record<string, unknown>
    const merged = { ...existing, ...parsed.data }
    settings.customer_field_visibility = merged

    const { error: updateError } = await sb
      .from('location_settings')
      .upsert(
        { location_id: session.locationId, settings, updated_at: new Date().toISOString() },
        { onConflict: 'location_id' }
      )
    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Customer fields update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
