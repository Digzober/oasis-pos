import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export async function adjustLoyaltyPoints(
  customerId: string, points: number, reasonId: string, notes: string, employeeId: string, orgId: string,
) {
  const sb = await createSupabaseServerClient()

  // Verify reason
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reason } = await (sb.from('loyalty_adjustment_reasons') as any)
    .select('*')
    .eq('id', reasonId)
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .single()
  if (!reason) throw new AppError('INVALID_REASON', 'Adjustment reason not found', undefined, 400)

  const { data, error } = await (sb as any).rpc('adjust_loyalty_points', {
    p_customer: customerId,
    p_org: orgId,
    p_delta: points,
    p_reason: 'manual_adjust',
    p_lifetime_delta: Math.max(points, 0),
    p_adjustment_reason: reasonId,
    p_created_by: employeeId,
  })
  if (error) {
    const insufficient = error.message?.includes('negative')
    throw new AppError(
      insufficient ? 'INSUFFICIENT_POINTS' : 'LOYALTY_ADJUST_FAILED',
      insufficient ? 'Adjustment would make balance negative' : error.message,
      error,
      insufficient ? 400 : 500,
    )
  }
  const newBalance = Number(data?.new_balance ?? 0)

  // Audit
   
  await sb.from('audit_log').insert({
    organization_id: orgId, employee_id: employeeId, entity_type: 'loyalty',
    event_type: 'adjust', entity_id: customerId, metadata: { points, reason: reason.name, notes, new_balance: newBalance },
  } as any)

  logger.info('Loyalty adjusted', { customerId, points, newBalance })
  return newBalance
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
