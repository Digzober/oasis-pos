import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const GroupsSchema = z.object({
  add_group_ids: z.array(z.uuid()).optional(),
  remove_group_ids: z.array(z.uuid()).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id: customerId } = await params
    const body = await request.json()
    const parsed = GroupsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { add_group_ids, remove_group_ids } = parsed.data
    const sb = await createSupabaseServerClient()

    // Add groups (upsert with ignoreDuplicates)
    if (add_group_ids && add_group_ids.length > 0) {
      const rows = add_group_ids.map((groupId) => ({
        customer_id: customerId,
        customer_group_id: groupId,
      }))

      const { error: addError } = await sb
        .from('customer_group_members')
        .upsert(rows, { ignoreDuplicates: true })

      if (addError) {
        logger.error('Customer group add failed', { error: addError.message, customerId })
        return NextResponse.json({ error: 'Failed to add customer to groups' }, { status: 500 })
      }
    }

    // Remove groups
    if (remove_group_ids && remove_group_ids.length > 0) {
      const { error: removeError } = await sb
        .from('customer_group_members')
        .delete()
        .eq('customer_id', customerId)
        .in('customer_group_id', remove_group_ids)

      if (removeError) {
        logger.error('Customer group remove failed', { error: removeError.message, customerId })
        return NextResponse.json({ error: 'Failed to remove customer from groups' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Customer groups error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
