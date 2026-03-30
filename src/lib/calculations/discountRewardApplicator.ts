import { roundMoney } from '@/lib/utils/money'
import type { DiscountReward, DiscountableItem, LineApplication } from './discount.types'
import { itemMatchesAnyFilter } from './discountMatcher'

export function applyReward(
  reward: DiscountReward,
  eligibleItems: DiscountableItem[],
  alreadyDiscounted: Map<string, number>,
): LineApplication[] {
  // Filter to rewardable items
  const rewardable = eligibleItems.filter((item) => itemMatchesAnyFilter(item, reward.filters))

  if (rewardable.length === 0) return []

  let applications: LineApplication[] = []

  switch (reward.reward_type) {
    case 'percentage':
      applications = applyPercentage(reward, rewardable, alreadyDiscounted)
      break
    case 'fixed_amount':
      applications = applyFixedAmount(reward, rewardable, alreadyDiscounted)
      break
    case 'price_to_amount':
      applications = applyPriceToAmount(reward, rewardable, alreadyDiscounted)
      break
    case 'free_item':
      applications = applyFreeItem(reward, rewardable, alreadyDiscounted)
      break
    case 'bogo':
      applications = applyBogo(reward, rewardable, alreadyDiscounted)
      break
  }

  // Apply max_discount_amount cap
  if (reward.max_discount_amount !== null) {
    let totalSoFar = 0
    applications = applications.map((app) => {
      const remaining = roundMoney(reward.max_discount_amount! - totalSoFar)
      if (remaining <= 0) return { ...app, discount_amount: 0 }
      const capped = Math.min(app.discount_amount, remaining)
      totalSoFar = roundMoney(totalSoFar + capped)
      return { ...app, discount_amount: capped }
    })
  }

  return applications.filter((a) => a.discount_amount > 0)
}

function maxDiscount(item: DiscountableItem, alreadyDiscounted: Map<string, number>): number {
  const existing = alreadyDiscounted.get(item.cart_line_id) ?? 0
  return Math.max(0, roundMoney(item.unit_price - existing))
}

function applyPercentage(
  reward: DiscountReward,
  items: DiscountableItem[],
  alreadyDiscounted: Map<string, number>,
): LineApplication[] {
  const rate = reward.value / 100
  const targetItems = selectByApplyTo(reward.apply_to, items)

  return targetItems.map((item) => {
    const raw = roundMoney(item.unit_price * rate)
    const capped = Math.min(raw, maxDiscount(item, alreadyDiscounted))
    return { cart_line_id: item.cart_line_id, discount_amount: capped, reward_type: 'percentage' }
  })
}

function applyFixedAmount(
  reward: DiscountReward,
  items: DiscountableItem[],
  alreadyDiscounted: Map<string, number>,
): LineApplication[] {
  if (reward.apply_to === 'cart_total') {
    // Spread fixed amount proportionally across items
    const totalPrice = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
    if (totalPrice <= 0) return []

    return items.map((item) => {
      const proportion = (item.unit_price * item.quantity) / totalPrice
      const raw = roundMoney(reward.value * proportion / item.quantity)
      const capped = Math.min(raw, maxDiscount(item, alreadyDiscounted))
      return { cart_line_id: item.cart_line_id, discount_amount: capped, reward_type: 'fixed_amount' }
    })
  }

  const targetItems = selectByApplyTo(reward.apply_to, items)
  return targetItems.map((item) => {
    const capped = Math.min(reward.value, maxDiscount(item, alreadyDiscounted))
    return { cart_line_id: item.cart_line_id, discount_amount: capped, reward_type: 'fixed_amount' }
  })
}

function applyPriceToAmount(
  reward: DiscountReward,
  items: DiscountableItem[],
  alreadyDiscounted: Map<string, number>,
): LineApplication[] {
  const targetItems = selectByApplyTo(reward.apply_to, items)
  return targetItems.map((item) => {
    const raw = roundMoney(item.unit_price - reward.value)
    if (raw <= 0) return { cart_line_id: item.cart_line_id, discount_amount: 0, reward_type: 'price_to_amount' }
    const capped = Math.min(raw, maxDiscount(item, alreadyDiscounted))
    return { cart_line_id: item.cart_line_id, discount_amount: capped, reward_type: 'price_to_amount' }
  })
}

function applyFreeItem(
  reward: DiscountReward,
  items: DiscountableItem[],
  alreadyDiscounted: Map<string, number>,
): LineApplication[] {
  const targetItems = selectByApplyTo(reward.apply_to === 'each_item' ? 'cheapest' : reward.apply_to, items)
  return targetItems.map((item) => {
    const capped = maxDiscount(item, alreadyDiscounted)
    return { cart_line_id: item.cart_line_id, discount_amount: capped, reward_type: 'free_item' }
  })
}

function applyBogo(
  reward: DiscountReward,
  items: DiscountableItem[],
  alreadyDiscounted: Map<string, number>,
): LineApplication[] {
  // Sort by price ascending so cheapest items are "free"
  const sorted = [...items].sort((a, b) => a.unit_price - b.unit_price)
  const freeCount = Math.floor(reward.value)
  const results: LineApplication[] = []

  let freed = 0
  for (const item of sorted) {
    if (freed >= freeCount) break
    const unitsToFree = Math.min(item.quantity, freeCount - freed)
    if (unitsToFree <= 0) continue
    const perUnit = Math.min(item.unit_price, maxDiscount(item, alreadyDiscounted))
    results.push({
      cart_line_id: item.cart_line_id,
      discount_amount: roundMoney(perUnit),
      reward_type: 'bogo',
    })
    freed += unitsToFree
  }

  return results
}

function selectByApplyTo(
  applyTo: string,
  items: DiscountableItem[],
): DiscountableItem[] {
  if (items.length === 0) return []

  switch (applyTo) {
    case 'cheapest': {
      const cheapest = items.reduce((min, i) => (i.unit_price < min.unit_price ? i : min), items[0]!)
      return [cheapest]
    }
    case 'most_expensive': {
      const expensive = items.reduce((max, i) => (i.unit_price > max.unit_price ? i : max), items[0]!)
      return [expensive]
    }
    case 'each_item':
    case 'cart_total':
    default:
      return items
  }
}
