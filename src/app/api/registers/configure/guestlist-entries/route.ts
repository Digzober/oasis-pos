import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CreateEntrySchema = z.object({
  customer_id: z.uuid().optional(),
  customer_name: z.string().max(200).optional(),
  customer_type: z.string().max(50).optional(),
  source: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  online_order_id: z.uuid().optional(),
})

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data: entries, error } = await sb
      .from('guestlist_entries')
      .select('*, customers ( first_name, last_name, customer_type ), guestlist_statuses ( id, name, color ), employees ( first_name, last_name )')
      .eq('location_id', session.locationId)
      .is('completed_at', null)
      .is('cancelled_at', null)
      .order('position', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ entries: entries ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Guestlist entries list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = CreateEntrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    // Get default status for this location
    const { data: defaultStatus } = await sb
      .from('guestlist_statuses')
      .select('id')
      .eq('location_id', session.locationId)
      .eq('is_active', true)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()

    let statusId = defaultStatus?.id ?? null

    // Fallback to first active status if no default
    if (!statusId) {
      const { data: firstStatus } = await sb
        .from('guestlist_statuses')
        .select('id')
        .eq('location_id', session.locationId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle()

      statusId = firstStatus?.id ?? null
    }

    // Calculate next position
    const { data: maxEntry } = await sb
      .from('guestlist_entries')
      .select('position')
      .eq('location_id', session.locationId)
      .is('completed_at', null)
      .is('cancelled_at', null)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPosition = (maxEntry?.position ?? 0) + 1

    const { data, error } = await sb
      .from('guestlist_entries')
      .insert({
        location_id: session.locationId,
        customer_id: parsed.data.customer_id ?? null,
        customer_name: parsed.data.customer_name ?? null,
        customer_type: parsed.data.customer_type ?? null,
        source: parsed.data.source ?? null,
        notes: parsed.data.notes ?? null,
        online_order_id: parsed.data.online_order_id ?? null,
        status_id: statusId,
        position: nextPosition,
        checked_in_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ entry: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Guestlist entry create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
