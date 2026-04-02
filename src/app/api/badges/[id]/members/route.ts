import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const BadgeMembersSchema = z.object({
  customer_ids: z.array(z.uuid()).min(1).max(500),
  notes: z.string().max(500).optional(),
})

const RemoveMembersSchema = z.object({
  customer_ids: z.array(z.uuid()).min(1).max(500),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = BadgeMembersSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const rows = parsed.data.customer_ids.map((customerId) => ({
      badge_id: id,
      customer_id: customerId,
      assigned_by: session.employeeId,
      notes: parsed.data.notes ?? null,
    }))

    const { data, error } = await sb
      .from('customer_badges')
      .upsert(rows, { onConflict: 'badge_id,customer_id', ignoreDuplicates: true })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, assigned: data?.length ?? 0 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Badge assign members error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = RemoveMembersSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { data, error } = await sb
      .from('customer_badges')
      .delete()
      .eq('badge_id', id)
      .in('customer_id', parsed.data.customer_ids)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, removed: data?.length ?? 0 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Badge remove members error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
