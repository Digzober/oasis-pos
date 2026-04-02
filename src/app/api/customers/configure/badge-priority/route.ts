import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateSchema = z.object({
  segment_ids: z.array(z.uuid()),
})

export async function GET() {
  try {
    const session = await requireSession()

    const sb = await createSupabaseServerClient()
    const { data: locSettings, error: settingsError } = await sb
      .from('location_settings')
      .select('settings')
      .eq('location_id', session.locationId)
      .single()
    if (settingsError) throw settingsError

    const settings = (locSettings?.settings ?? {}) as Record<string, unknown>
    const badgePriority = (settings.badge_priority ?? []) as string[]

    let badges: { segment_id: string; name: string; badge_color: string | null; priority: number }[] = []

    if (badgePriority.length > 0) {
      const { data: segments, error: segError } = await sb
        .from('segments')
        .select('id, name, badge_color')
        .eq('organization_id', session.organizationId)
        .in('id', badgePriority)
      if (segError) throw segError

      const segMap = new Map((segments ?? []).map(s => [s.id, s]))
      badges = badgePriority
        .map((segId, idx) => {
          const seg = segMap.get(segId)
          if (!seg) return null
          return { segment_id: seg.id, name: seg.name, badge_color: seg.badge_color, priority: idx + 1 }
        })
        .filter((b): b is NonNullable<typeof b> => b !== null)
    }

    return NextResponse.json({ badges })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Badge priority get error', { error: String(err) })
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
    settings.badge_priority = parsed.data.segment_ids

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
    logger.error('Badge priority update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
