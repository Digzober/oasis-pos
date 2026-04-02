import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateBadgeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  assignment_method: z.enum(['manual', 'automatic']).optional(),
  segment_id: z.uuid().nullable().optional(),
  show_in_register: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { data: badge, error: badgeError } = await sb
      .from('badges')
      .select('*, segments:segment_id ( id, name )')
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single()

    if (badgeError) {
      if (badgeError.code === 'PGRST116') return NextResponse.json({ error: 'Badge not found' }, { status: 404 })
      return NextResponse.json({ error: badgeError.message }, { status: 500 })
    }

    const { data: members } = await sb
      .from('customer_badges')
      .select('badge_id, customer_id, assigned_by, assigned_at, notes, customers ( id, first_name, last_name, phone, email, customer_type )')
      .eq('badge_id', id)
      .order('assigned_at', { ascending: false })

    return NextResponse.json({
      badge,
      members: members ?? [],
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Badge detail error', { error: String(err) })
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
    const parsed = UpdateBadgeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { data, error } = await sb
      .from('badges')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Badge not found' }, { status: 404 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ badge: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Badge update error', { error: String(err) })
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
    const sb = await createSupabaseServerClient()

    const { error } = await sb
      .from('badges')
      .update({ is_active: false, deactivated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', session.organizationId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Badge delete error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
