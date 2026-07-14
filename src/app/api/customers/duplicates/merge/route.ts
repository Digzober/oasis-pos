import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const MergeSchema = z.object({
  winner_id: z.uuid(),
  loser_id: z.uuid(),
  field_overrides: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = MergeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { winner_id, loser_id, field_overrides } = parsed.data

    if (winner_id === loser_id) {
      return NextResponse.json({ error: 'Winner and loser must be different customers' }, { status: 400 })
    }

    // Step 1: Fetch both customers, validate both are active and belong to org
    const { data: winner, error: winnerErr } = await sb
      .from('customers')
      .select('*')
      .eq('id', winner_id)
      .eq('organization_id', session.organizationId)
      .eq('status', 'active')
      .single()

    if (winnerErr || !winner) {
      return NextResponse.json({ error: 'Winner customer not found or inactive' }, { status: 404 })
    }

    const { data: loser, error: loserErr } = await sb
      .from('customers')
      .select('*')
      .eq('id', loser_id)
      .eq('organization_id', session.organizationId)
      .eq('status', 'active')
      .single()

    if (loserErr || !loser) {
      return NextResponse.json({ error: 'Loser customer not found or inactive' }, { status: 404 })
    }

    // Step 2: Apply field overrides to winner if provided
    if (field_overrides && Object.keys(field_overrides).length > 0) {
      const { error: overrideErr } = await sb
        .from('customers')
        .update(field_overrides as Record<string, unknown>)
        .eq('id', winner_id)

      if (overrideErr) {
        logger.error('Merge field override error', { error: overrideErr.message })
        return NextResponse.json({ error: 'Failed to apply field overrides' }, { status: 500 })
      }
    }

    // Step 3: Reassign loser's transactions to winner
    const { data: movedTxns } = await sb
      .from('transactions')
      .update({ customer_id: winner_id })
      .eq('customer_id', loser_id)
      .select('id')

    const transactionsMoved = movedTxns?.length ?? 0

    // Step 4: transfer loyalty under deterministic row locks. The loser id is
    // the idempotency reference, so a retried merge cannot double the points.
    const { data: loyaltyMerge, error: loyaltyError } = await (sb as any).rpc('adjust_loyalty_points', {
      p_customer: winner_id,
      p_org: session.organizationId,
      p_reason: 'customer_merge',
      p_reference: loser_id,
      p_source_customer: loser_id,
      p_created_by: session.employeeId,
    })
    if (loyaltyError) {
      logger.error('Merge loyalty transfer error', { error: loyaltyError.message })
      return NextResponse.json({ error: 'Failed to transfer loyalty points' }, { status: 500 })
    }
    const loyaltyPointsMoved = Number(loyaltyMerge?.delta ?? 0)

    // Step 5: Reassign group memberships (upsert to winner, then clean up loser)
    const { data: loserGroups } = await sb
      .from('customer_group_members')
      .select('customer_group_id')
      .eq('customer_id', loser_id)

    let groupsMoved = 0
    if (loserGroups && loserGroups.length > 0) {
      const upsertRows = loserGroups.map((g) => ({
        customer_group_id: g.customer_group_id,
        customer_id: winner_id,
      }))

      await sb
        .from('customer_group_members')
        .upsert(upsertRows, { onConflict: 'customer_group_id,customer_id', ignoreDuplicates: true })

      await sb
        .from('customer_group_members')
        .delete()
        .eq('customer_id', loser_id)

      groupsMoved = loserGroups.length
    }

    // Step 6: Reassign online orders
    await sb
      .from('online_orders')
      .update({ customer_id: winner_id })
      .eq('customer_id', loser_id)

    // Step 7: Merge aggregate fields on winner
    await sb
      .from('customers')
      .update({
        visit_count: winner.visit_count + loser.visit_count,
        lifetime_spend: winner.lifetime_spend + loser.lifetime_spend,
        updated_at: new Date().toISOString(),
      })
      .eq('id', winner_id)

    // Step 8: Deactivate loser
    await sb
      .from('customers')
      .update({
        status: 'inactive',
        notes: `Merged into ${winner_id} by ${session.employeeName} on ${new Date().toISOString()}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loser_id)

    // Step 9: Audit log entries
    const auditEntries = [
      {
        organization_id: session.organizationId,
        entity_type: 'customer',
        entity_id: winner_id,
        event_type: 'combine',
        employee_id: session.employeeId,
        metadata: { merge_role: 'winner', loser_id, transactions_moved: transactionsMoved, loyalty_points_moved: loyaltyPointsMoved, groups_moved: groupsMoved },
      },
      {
        organization_id: session.organizationId,
        entity_type: 'customer',
        entity_id: loser_id,
        event_type: 'combine',
        employee_id: session.employeeId,
        metadata: { merge_role: 'loser', winner_id, deactivated: true },
      },
    ]

    await sb.from('audit_log').insert(auditEntries)

    return NextResponse.json({
      success: true,
      transactions_moved: transactionsMoved,
      loyalty_points_moved: loyaltyPointsMoved,
      groups_moved: groupsMoved,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Customer merge error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
