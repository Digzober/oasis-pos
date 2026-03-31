import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export async function getReferralConfig(orgId: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb.from('referral_config') as any).select('*').eq('organization_id', orgId).eq('is_active', true).maybeSingle()
  return data
}

export async function updateReferralConfig(orgId: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (sb.from('referral_config') as any).select('id').eq('organization_id', orgId).maybeSingle()
  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb.from('referral_config') as any).update(input).eq('id', existing.id).select().single()
    return data
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb.from('referral_config') as any).insert({ organization_id: orgId, ...input }).select().single()
  return data
}

export async function createReferral(referrerId: string, refereeId: string, orgId: string) {
  if (referrerId === refereeId) throw new AppError('SELF_REFERRAL', 'Cannot refer yourself', undefined, 400)

  const sb = await createSupabaseServerClient()

  // Check duplicate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dup } = await (sb.from('referral_tracking') as any).select('id').eq('referrer_customer_id', referrerId).eq('referee_customer_id', refereeId).maybeSingle()
  if (dup) throw new AppError('DUPLICATE_REFERRAL', 'This referral already exists', undefined, 409)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('referral_tracking') as any).insert({
    organization_id: orgId, referrer_customer_id: referrerId, referee_customer_id: refereeId, status: 'pending',
  }).select().single()

  if (error) throw new AppError('REFERRAL_FAILED', error.message, error, 500)
  return data
}

export async function checkAndCompleteReferral(refereeCustomerId: string, transactionTotal: number, orgId: string) {
  const sb = await createSupabaseServerClient()

  const config = await getReferralConfig(orgId)
  if (!config) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pending } = await (sb.from('referral_tracking') as any).select('*').eq('referee_customer_id', refereeCustomerId).eq('status', 'pending').maybeSingle()
  if (!pending) return null

  if (transactionTotal < (config.min_purchase_amount ?? 0)) return null

  // Complete referral
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('referral_tracking') as any).update({ status: 'completed', completed_at: new Date().toISOString(), referrer_rewarded: true, referee_rewarded: true }).eq('id', pending.id)

  // Award points to referrer
  if (config.referrer_reward_points > 0) {
    await sb.from('loyalty_balances').update({
      current_points: (await sb.from('loyalty_balances').select('current_points').eq('customer_id', pending.referrer_customer_id).single()).data?.current_points + config.referrer_reward_points,
    } as Record<string, unknown>).eq('customer_id', pending.referrer_customer_id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from('loyalty_transactions') as any).insert({
      customer_id: pending.referrer_customer_id, organization_id: orgId,
      points_change: config.referrer_reward_points, balance_after: 0, reason: 'referral_bonus',
    })
  }

  // Award points to referee
  if (config.referee_reward_points > 0) {
    await sb.from('loyalty_balances').update({
      current_points: (await sb.from('loyalty_balances').select('current_points').eq('customer_id', refereeCustomerId).single()).data?.current_points + config.referee_reward_points,
    } as Record<string, unknown>).eq('customer_id', refereeCustomerId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from('loyalty_transactions') as any).insert({
      customer_id: refereeCustomerId, organization_id: orgId,
      points_change: config.referee_reward_points, balance_after: 0, reason: 'referral_bonus',
    })
  }

  logger.info('Referral completed', { referrerId: pending.referrer_customer_id, refereeId: refereeCustomerId })

  return { completed: true, referrerPoints: config.referrer_reward_points, refereePoints: config.referee_reward_points }
}
