import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const BulkMembersSchema = z.object({
  customer_ids: z.array(z.uuid()).min(1).max(500),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    if (!await assertOrgOwnership('customer_groups', id, session.organizationId)) return NextResponse.json({ error: 'Customer group not found' }, { status: 404 })
    const body = await request.json()
    const parsed = BulkMembersSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }
    if (!await assertOrgOwnership('customers', parsed.data.customer_ids, session.organizationId)) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    const sb = await createSupabaseServerClient()

    const rows = parsed.data.customer_ids.map((customerId) => ({
      customer_group_id: id,
      customer_id: customerId,
    }))

    const { data, error } = await sb
      .from('customer_group_members')
      .upsert(rows, { onConflict: 'customer_group_id,customer_id', ignoreDuplicates: true })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const addedCount = data?.length ?? 0

    return NextResponse.json({ success: true, added: addedCount })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Bulk add members error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    if (!await assertOrgOwnership('customer_groups', id, session.organizationId)) return NextResponse.json({ error: 'Customer group not found' }, { status: 404 })
    const body = await request.json()
    const parsed = BulkMembersSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }
    if (!await assertOrgOwnership('customers', parsed.data.customer_ids, session.organizationId)) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('customer_group_members')
      .delete()
      .eq('customer_group_id', id)
      .in('customer_id', parsed.data.customer_ids)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const removedCount = data?.length ?? 0

    return NextResponse.json({ success: true, removed: removedCount })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Bulk remove members error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
