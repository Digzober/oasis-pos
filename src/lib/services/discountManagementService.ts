import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export async function listDiscounts(orgId: string, filters?: { status?: string; search?: string; page?: number; per_page?: number }) {
  const sb = await createSupabaseServerClient()
  const page = filters?.page ?? 1
  const perPage = filters?.per_page ?? 50

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('discounts') as any).select('*', { count: 'exact' }).eq('organization_id', orgId)
  if (filters?.status === 'active') query = query.eq('status', 'active')
  else if (filters?.status === 'draft') query = query.eq('status', 'draft')
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, count } = await query.order('created_at', { ascending: false }).range((page - 1) * perPage, page * perPage - 1)
  return { discounts: data ?? [], total: count ?? 0 }
}

export async function getDiscountForEdit(id: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: discount } = await (sb.from('discounts') as any).select('*').eq('id', id).single()
  if (!discount) throw new AppError('NOT_FOUND', 'Discount not found', undefined, 404)

  const { data: constraints } = await sb.from('discount_constraints').select('*, discount_constraint_filters ( * )').eq('discount_id', id)
  const { data: rewards } = await sb.from('discount_rewards').select('*, discount_reward_filters ( * )').eq('discount_id', id)

  return { discount, constraints: constraints ?? [], rewards: rewards ?? [] }
}

export async function createDiscount(orgId: string, input: {
  discount: Record<string, unknown>
  constraints: Array<{ threshold: Record<string, unknown>; filters: Record<string, unknown>[] }>
  rewards: Array<{ reward: Record<string, unknown>; filters: Record<string, unknown>[] }>
}) {
  const sb = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: disc, error } = await (sb.from('discounts') as any).insert({ ...input.discount, organization_id: orgId }).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)

  for (const c of input.constraints) {
    const { data: constraint } = await (sb.from('discount_constraints') as any).insert({ ...c.threshold, discount_id: disc.id }).select('id').single()
    if (constraint && c.filters.length > 0) {
      await (sb.from('discount_constraint_filters') as any).insert(c.filters.map((f) => ({ ...f, constraint_id: constraint.id })))
    }
  }

  for (const r of input.rewards) {
    const { data: reward } = await (sb.from('discount_rewards') as any).insert({ ...r.reward, discount_id: disc.id }).select('id').single()
    if (reward && r.filters.length > 0) {
      await (sb.from('discount_reward_filters') as any).insert(r.filters.map((f) => ({ ...f, reward_id: reward.id })))
    }
  }

  logger.info('Discount created', { id: disc.id, name: disc.name })
  return disc
}

export async function updateDiscount(id: string, input: { discount?: Record<string, unknown>; constraints?: unknown; rewards?: unknown }) {
  const sb = await createSupabaseServerClient()
  if (input.discount) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from('discounts') as any).update(input.discount).eq('id', id)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb.from('discounts') as any).select('*').eq('id', id).single()
  return data
}

export async function deactivateDiscount(id: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('discounts') as any).update({ status: 'inactive' }).eq('id', id)
}

export async function duplicateDiscount(id: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orig } = await (sb.from('discounts') as any).select('*').eq('id', id).single()
  if (!orig) throw new AppError('NOT_FOUND', 'Discount not found', undefined, 404)

  const { id: _, created_at, updated_at, ...rest } = orig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: copy } = await (sb.from('discounts') as any).insert({ ...rest, name: `Copy of ${orig.name}`, status: 'draft', start_date: null, end_date: null }).select().single()

  // Copy constraints and rewards
  const { data: constraints } = await sb.from('discount_constraints').select('*, discount_constraint_filters ( * )').eq('discount_id', id)
  for (const c of constraints ?? []) {
    const { id: cId, discount_id, created_at: cCa, ...cRest } = c as Record<string, unknown>
    const { data: newC } = await (sb.from('discount_constraints') as any).insert({ ...cRest, discount_id: copy.id }).select('id').single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const f of ((c as any).discount_constraint_filters ?? []) as Record<string, unknown>[]) {
      const { id: fId, constraint_id, created_at: fCa, ...fRest } = f
      await (sb.from('discount_constraint_filters') as any).insert({ ...fRest, constraint_id: newC?.id })
    }
  }

  const { data: rewards } = await sb.from('discount_rewards').select('*, discount_reward_filters ( * )').eq('discount_id', id)
  for (const r of rewards ?? []) {
    const { id: rId, discount_id, created_at: rCa, ...rRest } = r as Record<string, unknown>
    const { data: newR } = await (sb.from('discount_rewards') as any).insert({ ...rRest, discount_id: copy.id }).select('id').single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const f of ((r as any).discount_reward_filters ?? []) as Record<string, unknown>[]) {
      const { id: fId, reward_id, created_at: fCa, ...fRest } = f
      await (sb.from('discount_reward_filters') as any).insert({ ...fRest, reward_id: newR?.id })
    }
  }

  logger.info('Discount duplicated', { originalId: id, newId: copy.id })
  return copy
}
