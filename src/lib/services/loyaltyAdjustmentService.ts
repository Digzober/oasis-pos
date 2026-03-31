import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export async function adjustLoyaltyPoints(
  customerId: string, points: number, reasonId: string, notes: string, employeeId: string, orgId: string,
) {
  const sb = await createSupabaseServerClient()

  // Verify reason
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reason } = await (sb.from('loyalty_adjustment_reasons') as any).select('*').eq('id', reasonId).eq('is_active', true).single()
  if (!reason) throw new AppError('INVALID_REASON', 'Adjustment reason not found', undefined, 400)

  // Load current balance
  const { data: balance } = await sb.from('loyalty_balances').select('current_points').eq('customer_id', customerId).single()
  if (!balance) throw new AppError('NO_BALANCE', 'Customer has no loyalty balance', undefined, 400)

  const newBalance = balance.current_points + points
  if (newBalance < 0) throw new AppError('INSUFFICIENT_POINTS', 'Adjustment would make balance negative', undefined, 400)

  await sb.from('loyalty_balances').update({ current_points: newBalance, updated_at: new Date().toISOString() }).eq('customer_id', customerId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('loyalty_transactions') as any).insert({
    customer_id: customerId, organization_id: orgId, points_change: points,
    balance_after: newBalance, reason: 'manual_adjust', adjustment_reason_id: reasonId,
    created_by: employeeId,
  })

  // Audit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await sb.from('audit_log').insert({
    organization_id: orgId, employee_id: employeeId, entity_type: 'loyalty',
    event_type: 'adjust', entity_id: customerId, metadata: { points, reason: reason.name, notes, new_balance: newBalance },
  } as any)

  logger.info('Loyalty adjusted', { customerId, points, newBalance })
}

export async function listAdjustmentReasons(orgId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('loyalty_adjustment_reasons').select('*').eq('organization_id', orgId).eq('is_active', true).order('name')
  return data ?? []
}

export async function createAdjustmentReason(input: { organization_id: string; name: string; requires_manager?: boolean }) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('loyalty_adjustment_reasons').insert(input).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}
