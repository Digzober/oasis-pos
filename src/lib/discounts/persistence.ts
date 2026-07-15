export const FILTER_FIELDS = [
  ['strain_ids', 'strain'],
  ['category_ids', 'category'],
  ['brand_ids', 'brand'],
  ['vendor_ids', 'vendor'],
  ['weight_ids', 'weight'],
  ['product_tag_ids', 'product_tag'],
  ['inventory_tag_ids', 'inventory_tag'],
  ['pricing_tier_ids', 'pricing_tier'],
  ['product_ids', 'product'],
] as const

export type DiscountFilterType = typeof FILTER_FIELDS[number][1]
export type DiscountFilterField = typeof FILTER_FIELDS[number][0]
export type EntityFilters = Record<DiscountFilterField, string[]>

export interface PersistedFilter {
  filter_type: DiscountFilterType
  filter_value_ids: string[]
}

export type ConstraintBuilderType = 'min_quantity' | 'min_spend' | 'min_weight'
export type ConstraintThresholdType = 'total_items' | 'total_spend' | 'total_weight'
export type RewardBuilderType = 'percentage' | 'fixed_amount' | 'price_to_amount' | 'bogo' | 'free_item'
export type RewardPersistenceType = 'percent_off' | 'dollar_off' | 'price_to_amount' | 'bogo' | 'free_item'
export type RewardApplyTo = 'each_item' | 'cheapest' | 'most_expensive' | 'cart_total'

const EMPTY_FILTERS: EntityFilters = {
  strain_ids: [],
  category_ids: [],
  brand_ids: [],
  vendor_ids: [],
  weight_ids: [],
  product_tag_ids: [],
  inventory_tag_ids: [],
  pricing_tier_ids: [],
  product_ids: [],
}

export function serializeEntityFilters(filters: EntityFilters): PersistedFilter[] {
  return FILTER_FIELDS.flatMap(([field, filterType]) => {
    const ids = filters[field]
    return ids.length > 0 ? [{ filter_type: filterType, filter_value_ids: ids }] : []
  })
}

export function deserializeEntityFilters(
  filters: Array<{ filter_type: string; filter_value_ids?: string[] | null }>,
): EntityFilters {
  const result: EntityFilters = { ...EMPTY_FILTERS }
  for (const row of filters) {
    const match = FILTER_FIELDS.find(([, type]) => type === row.filter_type)
    if (match) result[match[0]] = [...(row.filter_value_ids ?? [])]
  }
  return result
}

export function toConstraintThreshold(type: ConstraintBuilderType, minValue: number) {
  const thresholdTypes: Record<ConstraintBuilderType, ConstraintThresholdType> = {
    min_quantity: 'total_items',
    min_spend: 'total_spend',
    min_weight: 'total_weight',
  }
  return { threshold_type: thresholdTypes[type], min_value: minValue, group_by_sku: false }
}

export function fromConstraintThreshold(type: string): ConstraintBuilderType {
  const builderTypes: Record<ConstraintThresholdType, ConstraintBuilderType> = {
    total_items: 'min_quantity',
    total_spend: 'min_spend',
    total_weight: 'min_weight',
  }
  return builderTypes[type as ConstraintThresholdType] ?? 'min_quantity'
}

export function toRewardPersistence(
  type: RewardBuilderType,
  value: number,
  applyTo: RewardApplyTo,
) {
  const storedTypes: Record<RewardBuilderType, RewardPersistenceType> = {
    percentage: 'percent_off',
    fixed_amount: 'dollar_off',
    price_to_amount: 'price_to_amount',
    bogo: 'bogo',
    free_item: 'free_item',
  }
  return { discount_method: storedTypes[type], discount_value: value, apply_to: applyTo }
}

export function fromRewardPersistence(type: string): RewardBuilderType {
  const builderTypes: Record<RewardPersistenceType, RewardBuilderType> = {
    percent_off: 'percentage',
    dollar_off: 'fixed_amount',
    price_to_amount: 'price_to_amount',
    bogo: 'bogo',
    free_item: 'free_item',
  }
  return builderTypes[type as RewardPersistenceType] ?? 'percentage'
}
