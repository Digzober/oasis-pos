import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

export async function getLoyaltyConfig(orgId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('loyalty_config').select('*').eq('organization_id', orgId).maybeSingle()
  return data
}

export async function updateLoyaltyConfig(orgId: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  const { data: existing } = await sb.from('loyalty_config').select('id').eq('organization_id', orgId).maybeSingle()
  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb.from('loyalty_config') as any).update(input).eq('id', existing.id).select().single()
    return data
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb.from('loyalty_config') as any).insert({ organization_id: orgId, ...input }).select().single()
  return data
}

export async function listLoyaltyTiers(orgId: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb.from('loyalty_tiers') as any).select('*').eq('organization_id', orgId).order('min_points')
  return data ?? []
}

export async function createLoyaltyTier(input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('loyalty_tiers') as any).insert(input).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateLoyaltyTier(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('loyalty_tiers') as any).update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}

export async function deleteLoyaltyTier(id: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('loyalty_tiers') as any).delete().eq('id', id)
}
