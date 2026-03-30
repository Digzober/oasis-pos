import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { AppError } from '@/lib/utils/errors'
import type { DiscountWithRules, DiscountConstraint, DiscountReward, DiscountFilter } from './discount.types'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discounts: DiscountWithRules[] = (rows ?? []).map((d: any) => ({
    id: d.id,
    name: d.name,
    discount_type: d.discount_type ?? d.application_method ?? 'automatic',
    is_stackable: d.discount_stacking ?? false,
    priority: d.priority ?? 0,
    location_ids: d.location_ids ?? [],
    customer_type: (d.customer_types?.[0]) ?? 'all',
    customer_group_ids: d.customer_group_ids ?? [],
    segment_ids: d.segment_ids ?? [],
    first_time_only: d.first_time_customer_only ?? false,
    per_customer_limit: d.per_customer_limit ?? null,
    max_uses: null,
    current_uses: 0,
    requires_manager_approval: d.requires_manager_approval ?? false,
    start_date: d.start_date ?? null,
    end_date: d.end_date ?? null,
    is_recurring: false,
    recurrence_days: d.weekly_recurrence ?? [],
    recurrence_start_time: null,
    recurrence_end_time: null,
    constraints: (d.discount_constraints ?? []).map((c: any): DiscountConstraint => ({
      id: c.id,
      min_quantity: c.min_value ?? null,
      min_spend: null,
      min_weight: null,
      group_by_sku: c.group_by_sku ?? false,
      filters: (c.discount_constraint_filters ?? []).map(mapFilter),
    })),
    rewards: (d.discount_rewards ?? []).map((r: any): DiscountReward => ({
      id: r.id,
      reward_type: r.discount_method ?? 'percentage',
      value: r.discount_value ?? 0,
      max_discount_amount: null,
      apply_to: 'each_item',
      filters: (r.discount_reward_filters ?? []).map(mapFilter),
    })),
  }))

  cache.set(organizationId, { discounts, fetchedAt: Date.now() })
  return discounts
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFilter(f: any): DiscountFilter {
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
