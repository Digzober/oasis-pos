import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import type { Database } from '@/types/database'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
type DiscountInsert = Database['public']['Tables']['discounts']['Insert']
type DiscountUpdate = Database['public']['Tables']['discounts']['Update']
type ConstraintInsert = Database['public']['Tables']['discount_constraints']['Insert']
type ConstraintFilterInsert = Database['public']['Tables']['discount_constraint_filters']['Insert']
type RewardInsert = Database['public']['Tables']['discount_rewards']['Insert']
type RewardFilterInsert = Database['public']['Tables']['discount_reward_filters']['Insert']

interface ConstraintMutation {
  threshold: Omit<ConstraintInsert, 'discount_id'>
  filters: Array<Omit<ConstraintFilterInsert, 'constraint_id'>>
}

interface RewardMutation {
  reward: Omit<RewardInsert, 'discount_id'>
  filters: Array<Omit<RewardFilterInsert, 'reward_id'>>
}

export interface DiscountMutationInput {
  discount?: DiscountUpdate
  constraints?: ConstraintMutation[]
  rewards?: RewardMutation[]
}

interface CreateDiscountInput {
  discount: Omit<DiscountInsert, 'organization_id'>
  constraints: ConstraintMutation[]
  rewards: RewardMutation[]
}

function withoutCouponCode<T extends object>(discount: T): T {
  return Object.fromEntries(
    Object.entries(discount).filter(([key]) => key !== 'code'),
  ) as T
}

function throwDatabaseError(error: { message: string } | null, code: string): void {
  if (error) throw new AppError(code, error.message, error, 500)
}

export async function listDiscounts(
  orgId: string,
  filters?: { status?: string; search?: string; page?: number; per_page?: number },
) {
  const sb = await createSupabaseServerClient()
  const page = filters?.page ?? 1
  const perPage = filters?.per_page ?? 50
  let query = sb.from('discounts').select('*', { count: 'exact' }).eq('organization_id', orgId)
  if (filters?.status === 'active' || filters?.status === 'draft') query = query.eq('status', filters.status)
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`)
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)
  throwDatabaseError(error, 'LIST_FAILED')
  return { discounts: data ?? [], total: count ?? 0 }
}

export async function getDiscountForEdit(id: string) {
  const sb = await createSupabaseServerClient()
  const { data: discount, error } = await sb.from('discounts').select('*').eq('id', id).single()
  if (error || !discount) throw new AppError('NOT_FOUND', 'Discount not found', error, 404)
  const { data: constraints, error: constraintError } = await sb
    .from('discount_constraints').select('*, discount_constraint_filters ( * )').eq('discount_id', id)
  const { data: rewards, error: rewardError } = await sb
    .from('discount_rewards').select('*, discount_reward_filters ( * )').eq('discount_id', id)
  throwDatabaseError(constraintError, 'LOAD_RULES_FAILED')
  throwDatabaseError(rewardError, 'LOAD_RULES_FAILED')
  return { discount, constraints: constraints ?? [], rewards: rewards ?? [] }
}

async function insertConstraint(
  sb: SupabaseClient,
  discountId: string,
  mutation: ConstraintMutation,
): Promise<void> {
  const { data, error } = await sb.from('discount_constraints')
    .insert({ ...mutation.threshold, discount_id: discountId }).select('id').single()
  throwDatabaseError(error, 'RULE_WRITE_FAILED')
  if (!data || mutation.filters.length === 0) return
  const rows = mutation.filters.map((filter) => ({ ...filter, constraint_id: data.id }))
  const { error: filterError } = await sb.from('discount_constraint_filters').insert(rows)
  throwDatabaseError(filterError, 'RULE_WRITE_FAILED')
}

async function insertReward(
  sb: SupabaseClient,
  discountId: string,
  mutation: RewardMutation,
): Promise<void> {
  const { data, error } = await sb.from('discount_rewards')
    .insert({ ...mutation.reward, discount_id: discountId }).select('id').single()
  throwDatabaseError(error, 'RULE_WRITE_FAILED')
  if (!data || mutation.filters.length === 0) return
  const rows = mutation.filters.map((filter) => ({ ...filter, reward_id: data.id }))
  const { error: filterError } = await sb.from('discount_reward_filters').insert(rows)
  throwDatabaseError(filterError, 'RULE_WRITE_FAILED')
}

async function deleteConstraints(sb: SupabaseClient, discountId: string): Promise<void> {
  const { data, error } = await sb.from('discount_constraints').select('id').eq('discount_id', discountId)
  throwDatabaseError(error, 'RULE_WRITE_FAILED')
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length > 0) {
    const { error: filterError } = await sb.from('discount_constraint_filters').delete().in('constraint_id', ids)
    throwDatabaseError(filterError, 'RULE_WRITE_FAILED')
  }
  const { error: deleteError } = await sb.from('discount_constraints').delete().eq('discount_id', discountId)
  throwDatabaseError(deleteError, 'RULE_WRITE_FAILED')
}

async function deleteRewards(sb: SupabaseClient, discountId: string): Promise<void> {
  const { data, error } = await sb.from('discount_rewards').select('id').eq('discount_id', discountId)
  throwDatabaseError(error, 'RULE_WRITE_FAILED')
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length > 0) {
    const { error: filterError } = await sb.from('discount_reward_filters').delete().in('reward_id', ids)
    throwDatabaseError(filterError, 'RULE_WRITE_FAILED')
  }
  const { error: deleteError } = await sb.from('discount_rewards').delete().eq('discount_id', discountId)
  throwDatabaseError(deleteError, 'RULE_WRITE_FAILED')
}

async function replaceConstraints(
  sb: SupabaseClient,
  discountId: string,
  constraints: ConstraintMutation[],
): Promise<void> {
  await deleteConstraints(sb, discountId)
  for (const constraint of constraints) await insertConstraint(sb, discountId, constraint)
}

async function replaceRewards(
  sb: SupabaseClient,
  discountId: string,
  rewards: RewardMutation[],
): Promise<void> {
  await deleteRewards(sb, discountId)
  for (const reward of rewards) await insertReward(sb, discountId, reward)
}

export async function createDiscount(orgId: string, input: CreateDiscountInput) {
  const sb = await createSupabaseServerClient()
  const { data: discount, error } = await sb.from('discounts')
    .insert({ ...withoutCouponCode(input.discount), organization_id: orgId }).select().single()
  throwDatabaseError(error, 'CREATE_FAILED')
  if (!discount) throw new AppError('CREATE_FAILED', 'Discount insert returned no row', undefined, 500)
  for (const constraint of input.constraints) await insertConstraint(sb, discount.id, constraint)
  for (const reward of input.rewards) await insertReward(sb, discount.id, reward)
  logger.info('Discount created', { id: discount.id, name: discount.name })
  return discount
}

export async function updateDiscount(id: string, input: DiscountMutationInput) {
  const sb = await createSupabaseServerClient()
  if (input.discount) {
    const { error } = await sb.from('discounts')
      .update(withoutCouponCode(input.discount)).eq('id', id)
    throwDatabaseError(error, 'UPDATE_FAILED')
  }
  if (input.constraints) await replaceConstraints(sb, id, input.constraints)
  if (input.rewards) await replaceRewards(sb, id, input.rewards)
  const { data, error } = await sb.from('discounts').select('*').eq('id', id).single()
  throwDatabaseError(error, 'UPDATE_FAILED')
  return data
}

export async function deactivateDiscount(id: string) {
  const sb = await createSupabaseServerClient()
  const { error } = await sb.from('discounts').update({ status: 'disabled' }).eq('id', id)
  throwDatabaseError(error, 'UPDATE_FAILED')
}

interface DuplicateConstraint extends ConstraintInsert {
  discount_constraint_filters?: ConstraintFilterInsert[]
}

interface DuplicateReward extends RewardInsert {
  discount_reward_filters?: RewardFilterInsert[]
}

function omitKeys<T extends object, K extends keyof T>(row: T, keys: readonly K[]): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>
}

function cloneConstraint(row: DuplicateConstraint): ConstraintMutation {
  const { discount_constraint_filters } = row
  const threshold = omitKeys(row, ['id', 'discount_id', 'created_at', 'discount_constraint_filters'])
  const filters = (discount_constraint_filters ?? []).map((filter) => {
    return omitKeys(filter, ['id', 'constraint_id', 'created_at'])
  })
  return { threshold, filters }
}

function cloneReward(row: DuplicateReward): RewardMutation {
  const { discount_reward_filters } = row
  const reward = omitKeys(row, ['id', 'discount_id', 'created_at', 'discount_reward_filters'])
  const filters = (discount_reward_filters ?? []).map((filter) => {
    return omitKeys(filter, ['id', 'reward_id', 'created_at'])
  })
  return { reward, filters }
}

export async function duplicateDiscount(id: string) {
  const { discount, constraints, rewards } = await getDiscountForEdit(id)
  const organizationId = discount.organization_id
  const copy = omitKeys(discount, ['id', 'organization_id', 'created_at', 'updated_at'])
  return createDiscount(organizationId, {
    discount: { ...copy, name: `Copy of ${discount.name}`, status: 'draft', start_date: null, end_date: null },
    constraints: constraints.map((row) => cloneConstraint(row as unknown as DuplicateConstraint)),
    rewards: rewards.map((row) => cloneReward(row as unknown as DuplicateReward)),
  })
}
