import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CheckInSchema = z.object({
  location_id: z.uuid(),
  customer_id: z.uuid().optional(),
  customer_name: z.string().min(1).max(200),
  customer_type: z.enum(['recreational', 'medical']),
  source: z.enum(['walk_in', 'online_pickup', 'online_delivery', 'curbside', 'drive_thru', 'phone', 'kiosk']).default('walk_in'),
  notes: z.string().max(1000).optional(),
  party_size: z.number().int().min(1).max(20).optional(),
})

const ClaimSchema = z.object({
  id: z.uuid(),
  claimed_by_employee_id: z.uuid().optional(),
  status: z.string().max(100).optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireSession()
    const sb = await createSupabaseServerClient()

    const locationId = request.nextUrl.searchParams.get('location_id')
    if (!locationId) {
      return NextResponse.json({ error: 'location_id is required' }, { status: 400 })
    }

    const { data: entries, error } = await (sb as unknown as { from: (table: string) => ReturnType<typeof sb.from> })
      .from('guestlist_entries')
      .select('*, customers ( id, first_name, last_name, customer_type ), guestlist_statuses ( id, name, color ), employees ( id, first_name, last_name )')
      .eq('location_id', locationId)
      .is('completed_at', null)
      .is('cancelled_at', null)
      .order('checked_in_at', { ascending: true })

    if (error) {
      logger.error('Queue fetch error', { error: error.message, locationId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entries: entries ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Queue GET error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = CheckInSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { location_id, customer_id, customer_name, customer_type, source, notes, party_size } = parsed.data

    // Get default status for location
    const { data: defaultStatus } = await sb
      .from('guestlist_statuses')
      .select('id')
      .eq('location_id', location_id)
      .eq('is_active', true)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()

    let statusId = defaultStatus?.id ?? null

    if (!statusId) {
      const { data: firstStatus } = await sb
        .from('guestlist_statuses')
        .select('id')
        .eq('location_id', location_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle()

      statusId = firstStatus?.id ?? null
    }

    if (!statusId) {
      return NextResponse.json({ error: 'No guestlist statuses configured for this location' }, { status: 422 })
    }

    // Calculate next position
    const { data: maxEntry } = await (sb as unknown as { from: (table: string) => ReturnType<typeof sb.from> })
      .from('guestlist_entries')
      .select('position')
      .eq('location_id', location_id)
      .is('completed_at', null)
      .is('cancelled_at', null)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPosition = ((maxEntry as { position: number } | null)?.position ?? 0) + 1

    const { data, error } = await (sb as unknown as { from: (table: string) => ReturnType<typeof sb.from> })
      .from('guestlist_entries')
      .insert({
        location_id,
        customer_id: customer_id ?? null,
        customer_name,
        customer_type,
        source,
        notes: notes ?? null,
        party_size: party_size ?? 1,
        status_id: statusId,
        position: nextPosition,
        checked_in_at: new Date().toISOString(),
      })
      .select('*, customers ( id, first_name, last_name, customer_type ), guestlist_statuses ( id, name, color ), employees ( id, first_name, last_name )')
      .single()

    if (error) {
      logger.error('Queue check-in error', { error: error.message, location_id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Queue POST error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = ClaimSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { id, claimed_by_employee_id, status } = parsed.data

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Claim: assign budtender and set called_at
    if (claimed_by_employee_id) {
      updatePayload.employee_id = claimed_by_employee_id
      updatePayload.called_at = new Date().toISOString()
    }

    // Status transition: if moving to 'serving', set started_at
    if (status === 'serving') {
      updatePayload.started_at = new Date().toISOString()
      // Also auto-claim if not already claimed
      if (!claimed_by_employee_id) {
        updatePayload.employee_id = session.employeeId
        updatePayload.called_at = updatePayload.called_at ?? new Date().toISOString()
      }
    }

    // Status transition: if completing, set completed_at
    if (status === 'completed') {
      updatePayload.completed_at = new Date().toISOString()
    }

    // If a status name was provided, look up the status_id
    if (status) {
      const { data: statusRow } = await sb
        .from('guestlist_statuses')
        .select('id')
        .eq('location_id', session.locationId)
        .eq('name', status)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (statusRow) {
        updatePayload.status_id = statusRow.id
      }
    }

    const { data, error } = await (sb as unknown as { from: (table: string) => ReturnType<typeof sb.from> })
      .from('guestlist_entries')
      .update(updatePayload)
      .eq('id', id)
      .select('*, customers ( id, first_name, last_name, customer_type ), guestlist_statuses ( id, name, color ), employees ( id, first_name, last_name )')
      .single()

    if (error) {
      logger.error('Queue claim/update error', { error: error.message, entryId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Queue PATCH error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireSession()
    const sb = await createSupabaseServerClient()

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Soft delete: set cancelled_at
    const { error } = await (sb as unknown as { from: (table: string) => ReturnType<typeof sb.from> })
      .from('guestlist_entries')
      .update({ cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('Queue remove error', { error: error.message, entryId: id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Queue DELETE error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
