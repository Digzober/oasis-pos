import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateEntrySchema = z.object({
  status_id: z.uuid().optional(),
  employee_id: z.uuid().optional(),
  register_id: z.uuid().optional(),
  notes: z.string().max(1000).optional(),
  position: z.number().int().optional(),
  called_at: z.string().optional(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  cancelled_at: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    if (!await assertOrgOwnership('guestlist_entries', id, session.organizationId, undefined, session.locationId)) return NextResponse.json({ error: 'Guestlist entry not found' }, { status: 404 })
    const body = await request.json()
    const parsed = UpdateEntrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }
    if (parsed.data.status_id && !await assertOrgOwnership('guestlist_statuses', parsed.data.status_id, session.organizationId, undefined, session.locationId)) return NextResponse.json({ error: 'Guestlist status not found' }, { status: 404 })
    if (parsed.data.employee_id && !await assertOrgOwnership('employees', parsed.data.employee_id, session.organizationId)) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    if (parsed.data.register_id && !await assertOrgOwnership('registers', parsed.data.register_id, session.organizationId, undefined, session.locationId)) return NextResponse.json({ error: 'Register not found' }, { status: 404 })
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('guestlist_entries')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Guestlist entry update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    if (!await assertOrgOwnership('guestlist_entries', id, session.organizationId, undefined, session.locationId)) return NextResponse.json({ error: 'Guestlist entry not found' }, { status: 404 })
    const sb = await createSupabaseServerClient()

    const { error } = await sb
      .from('guestlist_entries')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Guestlist entry delete error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
