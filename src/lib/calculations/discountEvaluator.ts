import { roundMoney } from '@/lib/utils/money'
import type {
  DiscountableItem,
  DiscountWithRules,
  DiscountEvaluationContext,
  DiscountApplicationResult,
  AppliedDiscount,
} from './discount.types'
import { evaluateAllConstraints } from './discountConstraintEvaluator'
import { applyReward } from './discountRewardApplicator'

export function evaluateDiscounts(
  items: DiscountableItem[],
  discounts: DiscountWithRules[],
  context: DiscountEvaluationContext,
): DiscountApplicationResult {
  if (items.length === 0 || discounts.length === 0) {
    return { applied_discounts: [], available_manual_discounts: [], item_discounts: new Map(), total_discount: 0 }
  }

  // Step 1: Filter eligible discounts
  const eligible = discounts.filter((d) => isEligible(d, context))

  // Step 2: Sort by priority desc
  eligible.sort((a, b) => b.priority - a.priority)

  // Step 3: Separate automatic vs manual
  const automatic = eligible.filter((d) => d.discount_type === 'automatic')
  const manual = eligible.filter((d) => d.discount_type === 'manual' || d.discount_type === 'coupon')

  // Track cumulative discounts per item
  const itemDiscounts = new Map<string, number>()
  const itemHasNonStackable = new Set<string>()
  const appliedDiscounts: AppliedDiscount[] = []

  // Step 4: Evaluate automatic discounts
  for (const discount of automatic) {
    const result = tryApplyDiscount(discount, items, itemDiscounts, itemHasNonStackable)
    if (result) {
      appliedDiscounts.push(result)
    }
  }

  // Step 5: Return available manual discounts (not applied, just listed)
  const availableManual = manual
    .filter((d) => {
      const { allSatisfied } = evaluateAllConstraints(d.constraints, items)
      return allSatisfied
    })
    .map((d) => ({
      id: d.id,
      name: d.name,
      requires_manager_approval: d.requires_manager_approval,
    }))

  const totalDiscount = roundMoney(
    Array.from(itemDiscounts.values()).reduce((sum, v) => sum + v, 0),
  )

  return {
    applied_discounts: appliedDiscounts,
    available_manual_discounts: availableManual,
    item_discounts: itemDiscounts,
    total_discount: totalDiscount,
  }
}

function tryApplyDiscount(
  discount: DiscountWithRules,
  items: DiscountableItem[],
  itemDiscounts: Map<string, number>,
  itemHasNonStackable: Set<string>,
): AppliedDiscount | null {
  // Evaluate constraints
  const { allSatisfied, matchingItems } = evaluateAllConstraints(discount.constraints, items)
  if (!allSatisfied) return null

  // Check stacking: if non-stackable, skip items that already have non-stackable discounts
  const eligibleForReward = discount.is_stackable
    ? matchingItems
    : matchingItems.filter((i) => !itemHasNonStackable.has(i.cart_line_id))

  if (eligibleForReward.length === 0) return null

  // Apply each reward
  const allApplications: AppliedDiscount['line_applications'] = []

  for (const reward of discount.rewards) {
    const applications = applyReward(reward, eligibleForReward, itemDiscounts)
    allApplications.push(...applications)

    // Update cumulative tracking
    for (const app of applications) {
      const existing = itemDiscounts.get(app.cart_line_id) ?? 0
      itemDiscounts.set(app.cart_line_id, roundMoney(existing + app.discount_amount))

      if (!discount.is_stackable) {
        itemHasNonStackable.add(app.cart_line_id)
      }
    }
  }

  if (allApplications.length === 0) return null

  const totalSavings = roundMoney(
    allApplications.reduce((sum, a) => sum + a.discount_amount, 0),
  )

  return {
    discount_id: discount.id,
    discount_name: discount.name,
    discount_type: discount.discount_type,
    total_savings: totalSavings,
    line_applications: allApplications,
  }
}

function isEligible(d: DiscountWithRules, ctx: DiscountEvaluationContext): boolean {
  // Date range
  if (d.start_date && new Date(d.start_date) > ctx.now) return false
  if (d.end_date && new Date(d.end_date) < ctx.now) return false

  // Recurring schedule
  if (d.is_recurring && d.recurrence_days.length > 0) {
    const dayOfWeek = ctx.now.getDay()
    if (!d.recurrence_days.includes(dayOfWeek)) return false

    if (d.recurrence_start_time && d.recurrence_end_time) {
      const timeStr = ctx.now.toTimeString().slice(0, 5) // "HH:MM"
      if (timeStr < d.recurrence_start_time || timeStr > d.recurrence_end_time) return false
    }
  }

  // Location
  if (d.location_ids.length > 0 && !d.location_ids.includes(ctx.location_id)) return false

  // Customer type
  if (d.customer_type !== 'all') {
    if (d.customer_type !== ctx.customer_type) return false
  }

  // Customer groups
  if (d.customer_group_ids.length > 0) {
    const hasOverlap = d.customer_group_ids.some((gid) => ctx.customer_group_ids.includes(gid))
    if (!hasOverlap) return false
  }

  // Segments
  if (d.segment_ids.length > 0) {
    const hasOverlap = d.segment_ids.some((sid) => ctx.segment_ids.includes(sid))
    if (!hasOverlap) return false
  }

  // First time only
  if (d.first_time_only && !ctx.is_first_time) return false

  // Per-customer limit
  if (d.per_customer_limit !== null && ctx.customer_id) {
    const uses = ctx.customer_use_counts.get(d.id) ?? 0
    if (uses >= d.per_customer_limit) return false
  }

  // Max uses
  if (d.max_uses !== null && d.current_uses >= d.max_uses) return false

  return true
}
