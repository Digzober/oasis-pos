import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateCustomerBadgesSchema = z.object({
  add_badge_ids: z.array(z.uuid()).optional(),
  remove_badge_ids: z.array(z.uuid()).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('customer_badges')
      .select('badge_id, assigned_by, assigned_at, notes, badges ( id, name, color, icon, description, assignment_method )')
      .eq('customer_id', id)
      .order('assigned_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ badges: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Customer badges list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = UpdateCustomerBadgesSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    if (parsed.data.add_badge_ids && parsed.data.add_badge_ids.length > 0) {
      const rows = parsed.data.add_badge_ids.map((badgeId) => ({
        badge_id: badgeId,
        customer_id: id,
        assigned_by: session.employeeId,
      }))

      const { error: addError } = await sb
        .from('customer_badges')
        .upsert(rows, { onConflict: 'badge_id,customer_id', ignoreDuplicates: true })

      if (addError) return NextResponse.json({ error: addError.message }, { status: 500 })
    }

    if (parsed.data.remove_badge_ids && parsed.data.remove_badge_ids.length > 0) {
      const { error: removeError } = await sb
        .from('customer_badges')
        .delete()
        .eq('customer_id', id)
        .in('badge_id', parsed.data.remove_badge_ids)

      if (removeError) return NextResponse.json({ error: removeError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Customer badges update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
