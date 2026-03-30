import { roundMoney } from '@/lib/utils/money'
import type { DiscountConstraint, DiscountableItem } from './discount.types'
import { itemMatchesAnyFilter } from './discountMatcher'

export function evaluateConstraint(
  constraint: DiscountConstraint,
  items: DiscountableItem[],
): { satisfied: boolean; matchingItems: DiscountableItem[] } {
  const matching = items.filter((item) => itemMatchesAnyFilter(item, constraint.filters))

  if (matching.length === 0 && (constraint.min_quantity || constraint.min_spend || constraint.min_weight)) {
    return { satisfied: false, matchingItems: [] }
  }

  // No thresholds set = constraint is just a filter
  if (constraint.min_quantity === null && constraint.min_spend === null && constraint.min_weight === null) {
    return { satisfied: matching.length > 0 || constraint.filters.length === 0, matchingItems: matching }
  }

  if (constraint.group_by_sku) {
    // Each unique product must independently meet thresholds
    const byProduct = new Map<string, DiscountableItem[]>()
    for (const item of matching) {
      const list = byProduct.get(item.product_id) ?? []
      list.push(item)
      byProduct.set(item.product_id, list)
    }

    for (const [, productItems] of byProduct) {
      if (!meetsThresholds(productItems, constraint)) {
        return { satisfied: false, matchingItems: [] }
      }
    }
    return { satisfied: true, matchingItems: matching }
  }

  // Evaluate across all matching items combined
  if (!meetsThresholds(matching, constraint)) {
    return { satisfied: false, matchingItems: [] }
  }

  return { satisfied: true, matchingItems: matching }
}

function meetsThresholds(items: DiscountableItem[], constraint: DiscountConstraint): boolean {
  if (constraint.min_quantity !== null) {
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
    if (totalQty < constraint.min_quantity) return false
  }

  if (constraint.min_spend !== null) {
    const totalSpend = items.reduce((sum, i) => roundMoney(sum + i.unit_price * i.quantity), 0)
    if (totalSpend < constraint.min_spend) return false
  }

  if (constraint.min_weight !== null) {
    const totalWeight = items.reduce((sum, i) => sum + (i.weight_grams ?? 0) * i.quantity, 0)
    if (totalWeight < constraint.min_weight) return false
  }

  return true
}

export function evaluateAllConstraints(
  constraints: DiscountConstraint[],
  items: DiscountableItem[],
): { allSatisfied: boolean; matchingItems: DiscountableItem[] } {
  if (constraints.length === 0) {
    return { allSatisfied: true, matchingItems: items }
  }

  let allMatching = new Set<string>()
  let first = true

  for (const constraint of constraints) {
    const result = evaluateConstraint(constraint, items)
    if (!result.satisfied) {
      return { allSatisfied: false, matchingItems: [] }
    }
    const ids = new Set(result.matchingItems.map((i) => i.cart_line_id))
    if (first) {
      allMatching = ids
      first = false
    } else {
      // Union of matching items across constraints
      for (const id of ids) allMatching.add(id)
    }
  }

  return {
    allSatisfied: true,
    matchingItems: items.filter((i) => allMatching.has(i.cart_line_id)),
  }
}
