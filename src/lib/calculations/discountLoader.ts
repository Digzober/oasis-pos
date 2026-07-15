import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { AppError } from '@/lib/utils/errors'
import type { DiscountWithRules, DiscountConstraint, DiscountReward, DiscountFilter } from './discount.types'
import { fromRewardPersistence, type RewardPersistenceType } from '@/lib/discounts/persistence'

interface CacheEntry {
  discounts: DiscountWithRules[]
  fetchedAt: number
}

const TTL_MS = 2 * 60 * 1000
const cache = new Map<string, CacheEntry>()

const EMPTY_FILTER: DiscountFilter = {
  strain_ids: [], category_ids: [], brand_ids: [], vendor_ids: [],
  weight_ids: [], product_tag_ids: [], inventory_tag_ids: [],
  pricing_tier_ids: [], product_ids: [],
}

export async function loadActiveDiscounts(organizationId: string): Promise<DiscountWithRules[]> {
  const cached = cache.get(organizationId)
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.discounts

  const sb = await createSupabaseServerClient()

  const { data: rows, error } = await sb
    .from('discounts')
    .select(`
      *,
      discount_constraints (
        *,
        discount_constraint_filters ( * )
      ),
      discount_rewards (
        *,
        discount_reward_filters ( * )
      )
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'active')

  if (error) {
    logger.error('Failed to load discounts', { error: error.message })
    throw new AppError('DISCOUNTS_LOAD_FAILED', 'Failed to load discounts', error, 500)
  }

  const discounts = (rows ?? []).map((row) => mapDiscountRow(row as unknown as DiscountRow))

  cache.set(organizationId, { discounts, fetchedAt: Date.now() })
  return discounts
}

interface FilterRow {
  filter_type: string
  filter_value_ids?: string[] | null
}

interface ConstraintRow {
  id: string
  threshold_type?: string | null
  min_value?: number | null
  group_by_sku?: boolean | null
  discount_constraint_filters?: FilterRow[] | null
}

interface RewardRow {
  id: string
  discount_method?: string | null
  discount_value?: number | null
  apply_to?: string | null
  discount_reward_filters?: FilterRow[] | null
}

export interface DiscountRow {
  id: string
  name: string
  application_method?: string | null
  code?: string | null
  discount_stacking?: boolean | null
  priority?: number | null
  location_ids?: string[] | null
  customer_types?: string[] | null
  customer_group_ids?: string[] | null
  segment_ids?: string[] | null
  first_time_customer_only?: boolean | null
  per_customer_limit?: number | null
  requires_manager_approval?: boolean | null
  start_date?: string | null
  end_date?: string | null
  weekly_recurrence?: number[] | null
  recurrence_start_time?: string | null
  recurrence_end_time?: string | null
  discount_constraints?: ConstraintRow[] | null
  discount_rewards?: RewardRow[] | null
}

export function mapDiscountRow(d: DiscountRow): DiscountWithRules {
  const recurrenceDays = d.weekly_recurrence ?? []
  return {
    id: d.id,
    name: d.name,
    discount_type: d.code ? 'coupon' : (d.application_method ?? 'automatic') as 'automatic' | 'manual',
    is_stackable: d.discount_stacking ?? false,
    priority: d.priority ?? 0,
    location_ids: d.location_ids ?? [],
    customer_types: normalizeCustomerTypes(d.customer_types),
    customer_group_ids: d.customer_group_ids ?? [],
    segment_ids: d.segment_ids ?? [],
    first_time_only: d.first_time_customer_only ?? false,
    per_customer_limit: d.per_customer_limit ?? null,
    max_uses: null,
    current_uses: 0,
    requires_manager_approval: d.requires_manager_approval ?? false,
    start_date: d.start_date ?? null,
    end_date: d.end_date ?? null,
    is_recurring: recurrenceDays.length > 0,
    recurrence_days: recurrenceDays,
    recurrence_start_time: d.recurrence_start_time ?? null,
    recurrence_end_time: d.recurrence_end_time ?? null,
    constraints: (d.discount_constraints ?? []).map((c): DiscountConstraint => ({
      id: c.id,
      min_quantity: c.threshold_type === 'total_items' ? c.min_value ?? null : null,
      min_spend: c.threshold_type === 'total_spend' ? c.min_value ?? null : null,
      min_weight: c.threshold_type === 'total_weight' ? c.min_value ?? null : null,
      group_by_sku: c.group_by_sku ?? false,
      filters: (c.discount_constraint_filters ?? []).map(mapFilter),
    })),
    rewards: (d.discount_rewards ?? []).map((r): DiscountReward => ({
      id: r.id,
      reward_type: mapRewardType(r.discount_method),
      value: r.discount_value ?? 0,
      max_discount_amount: null,
      apply_to: mapApplyTo(r.apply_to),
      filters: (r.discount_reward_filters ?? []).map(mapFilter),
    })),
  }
}

function normalizeCustomerTypes(values?: string[] | null): Array<'all' | 'recreational' | 'medical'> {
  const valid = (values ?? []).filter(
    (value): value is 'all' | 'recreational' | 'medical' =>
      value === 'all' || value === 'recreational' || value === 'medical',
  )
  return valid.length > 0 ? valid : ['all']
}

function mapRewardType(value?: string | null): DiscountReward['reward_type'] {
  const valid: RewardPersistenceType = value === 'dollar_off' || value === 'price_to_amount'
    || value === 'bogo' || value === 'free_item' ? value : 'percent_off'
  return fromRewardPersistence(valid)
}

function mapApplyTo(value?: string | null): DiscountReward['apply_to'] {
  return value === 'cheapest' || value === 'most_expensive' || value === 'cart_total'
    ? value : 'each_item'
}

function mapFilter(f: FilterRow): DiscountFilter {
  return {
    strain_ids: f.filter_type === 'strain' ? (f.filter_value_ids ?? []) : EMPTY_FILTER.strain_ids,
    category_ids: f.filter_type === 'category' ? (f.filter_value_ids ?? []) : EMPTY_FILTER.category_ids,
    brand_ids: f.filter_type === 'brand' ? (f.filter_value_ids ?? []) : EMPTY_FILTER.brand_ids,
    vendor_ids: f.filter_type === 'vendor' ? (f.filter_value_ids ?? []) : EMPTY_FILTER.vendor_ids,
    weight_ids: f.filter_type === 'weight' ? (f.filter_value_ids ?? []) : EMPTY_FILTER.weight_ids,
    product_tag_ids: f.filter_type === 'product_tag' ? (f.filter_value_ids ?? []) : EMPTY_FILTER.product_tag_ids,
    inventory_tag_ids: f.filter_type === 'inventory_tag' ? (f.filter_value_ids ?? []) : EMPTY_FILTER.inventory_tag_ids,
    pricing_tier_ids: f.filter_type === 'pricing_tier' ? (f.filter_value_ids ?? []) : EMPTY_FILTER.pricing_tier_ids,
    product_ids: f.filter_type === 'product' ? (f.filter_value_ids ?? []) : EMPTY_FILTER.product_ids,
  }
}

export function clearDiscountCache(): void {
  cache.clear()
}
