import { describe, expect, it } from 'vitest'
import {
  deserializeEntityFilters,
  serializeEntityFilters,
  toConstraintThreshold,
  toRewardPersistence,
} from '@/lib/discounts/persistence'

const allFilters = {
  strain_ids: ['strain-1'],
  category_ids: ['category-1'],
  brand_ids: ['brand-1'],
  vendor_ids: ['vendor-1'],
  weight_ids: ['3.5g'],
  product_tag_ids: ['product-tag-1'],
  inventory_tag_ids: ['inventory-tag-1'],
  pricing_tier_ids: ['tier-1'],
  product_ids: ['product-1'],
}

describe('discount builder persistence mapping', () => {
  it('round-trips every constraint and reward filter type without dropping selections', () => {
    const rows = serializeEntityFilters(allFilters)

    expect(rows.map((row) => row.filter_type)).toEqual([
      'strain', 'category', 'brand', 'vendor', 'weight', 'product_tag',
      'inventory_tag', 'pricing_tier', 'product',
    ])
    expect(deserializeEntityFilters(rows)).toEqual(allFilters)
  })

  it.each([
    ['min_quantity', 'total_items'],
    ['min_spend', 'total_spend'],
    ['min_weight', 'total_weight'],
  ] as const)('persists %s using the approved threshold value %s', (builderType, storedType) => {
    expect(toConstraintThreshold(builderType, 12)).toEqual({
      threshold_type: storedType,
      min_value: 12,
      group_by_sku: false,
    })
  })

  it.each([
    ['percentage', 'percent_off'],
    ['fixed_amount', 'dollar_off'],
    ['price_to_amount', 'price_to_amount'],
    ['bogo', 'bogo'],
    ['free_item', 'free_item'],
  ] as const)('persists %s using the approved reward value %s', (builderType, storedType) => {
    expect(toRewardPersistence(builderType, 10, 'most_expensive')).toEqual({
      discount_method: storedType,
      discount_value: 10,
      apply_to: 'most_expensive',
    })
  })
})
