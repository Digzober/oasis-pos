import type { DiscountableItem, DiscountFilter } from './discount.types'

function hasOverlap(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false
  const set = new Set(a)
  return b.some((v) => set.has(v))
}

export function itemMatchesFilter(
  item: DiscountableItem,
  filter: DiscountFilter,
): boolean {
  // If all arrays are empty, matches everything
  const hasAnyFilter =
    filter.product_ids.length > 0 ||
    filter.category_ids.length > 0 ||
    filter.brand_ids.length > 0 ||
    filter.vendor_ids.length > 0 ||
    filter.strain_ids.length > 0 ||
    filter.weight_ids.length > 0 ||
    filter.product_tag_ids.length > 0 ||
    filter.inventory_tag_ids.length > 0 ||
    filter.pricing_tier_ids.length > 0

  if (!hasAnyFilter) return true

  // Each non-empty array is an AND condition; within each array, OR logic
  if (filter.product_ids.length > 0 && !filter.product_ids.includes(item.product_id)) return false
  if (filter.category_ids.length > 0 && !filter.category_ids.includes(item.category_id)) return false
  if (filter.brand_ids.length > 0 && (item.brand_id === null || !filter.brand_ids.includes(item.brand_id))) return false
  if (filter.vendor_ids.length > 0 && (item.vendor_id === null || !filter.vendor_ids.includes(item.vendor_id))) return false
  if (filter.strain_ids.length > 0 && (item.strain_id === null || !filter.strain_ids.includes(item.strain_id))) return false
  if (filter.weight_ids.length > 0 && (item.weight_descriptor === null || !filter.weight_ids.includes(item.weight_descriptor))) return false
  if (filter.pricing_tier_ids.length > 0 && (item.pricing_tier_id === null || !filter.pricing_tier_ids.includes(item.pricing_tier_id))) return false
  if (filter.product_tag_ids.length > 0 && !hasOverlap(filter.product_tag_ids, item.product_tag_ids)) return false
  if (filter.inventory_tag_ids.length > 0 && !hasOverlap(filter.inventory_tag_ids, item.inventory_tag_ids)) return false

  return true
}

export function itemMatchesAnyFilter(
  item: DiscountableItem,
  filters: DiscountFilter[],
): boolean {
  if (filters.length === 0) return true
  return filters.some((f) => itemMatchesFilter(item, f))
}
