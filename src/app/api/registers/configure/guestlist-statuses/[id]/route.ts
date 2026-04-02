import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateStatusSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional(),
  sort_order: z.number().int().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = UpdateStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { data, error } = await sb
      .from('guestlist_statuses')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Status not found' }, { status: 404 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Guestlist status update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { error } = await sb
      .from('guestlist_statuses')
      .update({ is_active: false, deactivated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Guestlist status delete error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
