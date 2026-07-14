import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export async function awardReferralPoints(
  sb: ServerSupabaseClient,
  customerId: string,
  organizationId: string,
  rewardPoints: number,
) {
  const { data: balance, error: balanceError } = await sb
    .from('loyalty_balances')
    .select('current_points, lifetime_points')
    .eq('customer_id', customerId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (balanceError) {
    throw new AppError('LOYALTY_BALANCE_READ_FAILED', balanceError.message, balanceError, 500)
  }

  const currentPoints = balance?.current_points ?? 0
  const lifetimePoints = balance?.lifetime_points ?? 0
  const nextCurrentPoints = currentPoints + rewardPoints

  const { error: upsertError } = await sb.from('loyalty_balances').upsert({
    customer_id: customerId,
    organization_id: organizationId,
    current_points: nextCurrentPoints,
    lifetime_points: lifetimePoints + rewardPoints,
  }, { onConflict: 'customer_id,organization_id' })

  if (upsertError) {
    throw new AppError('LOYALTY_BALANCE_WRITE_FAILED', upsertError.message, upsertError, 500)
  }

  const { error: journalError } = await sb.from('loyalty_transactions').insert({
    customer_id: customerId,
    organization_id: organizationId,
    points_change: rewardPoints,
    balance_after: nextCurrentPoints,
    reason: 'referral_bonus',
  })

  if (journalError) {
    throw new AppError('LOYALTY_JOURNAL_WRITE_FAILED', journalError.message, journalError, 500)
  }

  return nextCurrentPoints
}

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
    await awardReferralPoints(sb, pending.referrer_customer_id, orgId, config.referrer_reward_points)
  }

  // Award points to referee
  if (config.referee_reward_points > 0) {
    await awardReferralPoints(sb, refereeCustomerId, orgId, config.referee_reward_points)
  }

  logger.info('Referral completed', { referrerId: pending.referrer_customer_id, refereeId: refereeCustomerId })

  return { completed: true, referrerPoints: config.referrer_reward_points, refereePoints: config.referee_reward_points }
}
