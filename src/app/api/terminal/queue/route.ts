import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import {
  getGuestlistWorkflowEventsByStatusId,
  resolveGuestlistCheckInStatusId,
  type GuestlistWorkflowEventsByStatusId,
} from '@/lib/guestlist/workflowMappings'
import { requireAccessibleLocation } from '@/lib/settings/access'
import { getSettingsSnapshot } from '@/lib/settings/service'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

const QUEUE_CARD_SELECT = `
  *,
  customers (
    id, first_name, last_name, nickname, date_of_birth, address_line1, address_line2,
    city, state, zip, customer_type, drivers_license, drivers_license_expiration,
    medical_card_number, medical_card_expiration, pronoun, last_visit_at, visit_count,
    opted_into_loyalty, customer_group_members ( customer_groups ( name ) )
  ),
  guestlist_statuses ( id, name, color ),
  employees ( id, first_name, last_name ),
  registers ( name ),
  online_orders (
    status, total, order_number, order_type, scheduled_time, notes, delivery_address,
    online_order_lines ( id ),
    delivery_vehicles ( name, inventory_room:rooms ( name ) )
  )
`
const COMPLETED_CARD_WINDOW_MS = 30 * 60 * 1000

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

type QueueStatusEntry = {
  guestlist_statuses: { id: string } | null
}

function attachWorkflowEvents(
  entries: QueueStatusEntry[],
  eventsByStatusId: GuestlistWorkflowEventsByStatusId,
) {
  return entries.map((entry) => ({
    ...entry,
    workflow_event: entry.guestlist_statuses?.id
      ? eventsByStatusId[entry.guestlist_statuses.id] ?? null
      : null,
  }))
}

async function requireAccessibleEntryLocation(
  sb: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  session: Awaited<ReturnType<typeof requireSession>>,
  entryId: string,
) {
  const { data, error } = await sb.from('guestlist_entries')
    .select('location_id').eq('id', entryId).maybeSingle()
  if (error) throw new AppError('QUEUE_LOOKUP_FAILED', error.message, error, 500)
  if (!data) throw new AppError('QUEUE_ENTRY_NOT_FOUND', 'Queue entry not found', undefined, 404)
  await requireAccessibleLocation(session, data.location_id)
  return data.location_id
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const locationId = request.nextUrl.searchParams.get('location_id')
    if (!locationId) {
      return NextResponse.json({ error: 'location_id is required' }, { status: 400 })
    }
    await requireAccessibleLocation(session, locationId)

    const { data: entries, error } = await (sb as unknown as { from: (table: string) => ReturnType<typeof sb.from> })
      .from('guestlist_entries')
      .select(QUEUE_CARD_SELECT)
      .eq('location_id', locationId)
      .or(`completed_at.is.null,completed_at.gte.${new Date(Date.now() - COMPLETED_CARD_WINDOW_MS).toISOString()}`)
      .is('cancelled_at', null)
      .order('checked_in_at', { ascending: true })

    if (error) {
      logger.error('Queue fetch error', { error: error.message, locationId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const [snapshot, eventsByStatusId] = await Promise.all([
      getSettingsSnapshot(locationId),
      getGuestlistWorkflowEventsByStatusId(locationId, sb),
    ])
    return NextResponse.json({
      entries: attachWorkflowEvents((entries ?? []) as QueueStatusEntry[], eventsByStatusId),
      card_fields: snapshot.location.customer_card_fields ?? {},
    })
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
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = CheckInSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { location_id, customer_id, customer_name, customer_type, source, notes, party_size } = parsed.data
    await requireAccessibleLocation(session, location_id)

    const statusId = await resolveGuestlistCheckInStatusId(location_id, source, sb)

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
    const locationId = await requireAccessibleEntryLocation(sb, session, id)

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
        .eq('location_id', locationId)
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
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    await requireAccessibleEntryLocation(sb, session, id)

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
