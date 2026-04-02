import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const AdjustSchema = z.object({
  points: z.number().int(),
  reason: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id: customerId } = await params
    const body = await request.json()
    const parsed = AdjustSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { points, reason, notes } = parsed.data
    const sb = await createSupabaseServerClient()

    // Fetch or create loyalty balance
    const { data: existing, error: fetchError } = await sb
      .from('loyalty_balances')
      .select('id, current_points, lifetime_points')
      .eq('customer_id', customerId)
      .eq('organization_id', session.organizationId)
      .maybeSingle()

    if (fetchError) {
      logger.error('Loyalty balance fetch failed', { error: fetchError.message, customerId })
      return NextResponse.json({ error: 'Failed to fetch loyalty balance' }, { status: 500 })
    }

    let balanceId: string
    let currentPoints: number
    let lifetimePoints: number

    if (!existing) {
      // Create a new loyalty balance record
      const { data: created, error: createError } = await sb
        .from('loyalty_balances')
        .insert({
          customer_id: customerId,
          organization_id: session.organizationId,
          current_points: 0,
          lifetime_points: 0,
        })
        .select('id, current_points, lifetime_points')
        .single()

      if (createError || !created) {
        logger.error('Loyalty balance creation failed', { error: createError?.message, customerId })
        return NextResponse.json({ error: 'Failed to create loyalty balance' }, { status: 500 })
      }

      balanceId = created.id
      currentPoints = created.current_points
      lifetimePoints = created.lifetime_points
    } else {
      balanceId = existing.id
      currentPoints = existing.current_points
      lifetimePoints = existing.lifetime_points
    }

    const newCurrentPoints = currentPoints + points
    const newLifetimePoints = lifetimePoints + Math.max(0, points)

    if (newCurrentPoints < 0) {
      return NextResponse.json({ error: 'Adjustment would result in negative balance' }, { status: 400 })
    }

    // Update the balance
    const { error: updateError } = await sb
      .from('loyalty_balances')
      .update({
        current_points: newCurrentPoints,
        lifetime_points: newLifetimePoints,
      })
      .eq('id', balanceId)

    if (updateError) {
      logger.error('Loyalty balance update failed', { error: updateError.message, customerId })
      return NextResponse.json({ error: 'Failed to update loyalty balance' }, { status: 500 })
    }

    // Insert loyalty transaction record
    const { error: txnError } = await sb
      .from('loyalty_transactions')
      .insert({
        customer_id: customerId,
        organization_id: session.organizationId,
        points_change: points,
        balance_after: newCurrentPoints,
        reason,
        notes: notes ?? null,
        created_by: session.employeeId,
      })

    if (txnError) {
      logger.error('Loyalty transaction insert failed', { error: txnError.message, customerId })
      return NextResponse.json({ error: 'Failed to record loyalty transaction' }, { status: 500 })
    }

    // Audit log
    const { error: auditError } = await sb
      .from('audit_log')
      .insert({
        organization_id: session.organizationId,
        entity_type: 'loyalty_balance',
        entity_id: balanceId,
        event_type: 'adjust',
        details: {
          customer_id: customerId,
          points_change: points,
          balance_before: currentPoints,
          balance_after: newCurrentPoints,
          reason,
          notes: notes ?? null,
        },
        performed_by: session.employeeId,
      })

    if (auditError) {
      logger.error('Loyalty adjust audit log failed', { error: auditError.message })
    }

    return NextResponse.json({ success: true, new_balance: newCurrentPoints })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Loyalty adjust error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
