import { describe, it, expect } from 'vitest'
import { evaluateDiscounts } from '../discountEvaluator'
import type { DiscountableItem, DiscountWithRules, DiscountEvaluationContext } from '../discount.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<DiscountableItem> = {}): DiscountableItem {
  return {
    cart_line_id: 'line-1',
    product_id: 'prod-1',
    inventory_item_id: 'inv-1',
    brand_id: 'brand-1',
    vendor_id: null,
    strain_id: null,
    category_id: 'cat-flower',
    pricing_tier_id: null,
    product_tag_ids: [],
    inventory_tag_ids: [],
    weight_descriptor: '3.5g',
    weight_grams: 3.5,
    quantity: 1,
    unit_price: 30,
    is_medical: false,
    ...overrides,
  }
}

function makeDiscount(overrides: Partial<DiscountWithRules> = {}): DiscountWithRules {
  return {
    id: 'disc-1',
    name: 'Test Discount',
    discount_type: 'automatic',
    is_stackable: false,
    priority: 10,
    location_ids: [],
    customer_type: 'all',
    customer_group_ids: [],
    segment_ids: [],
    first_time_only: false,
    per_customer_limit: null,
    max_uses: null,
    current_uses: 0,
    requires_manager_approval: false,
    start_date: null,
    end_date: null,
    is_recurring: false,
    recurrence_days: [],
    recurrence_start_time: null,
    recurrence_end_time: null,
    constraints: [],
    rewards: [{
      id: 'reward-1',
      reward_type: 'percentage',
      value: 10,
      max_discount_amount: null,
      apply_to: 'each_item',
      filters: [],
    }],
    ...overrides,
  }
}

const defaultCtx: DiscountEvaluationContext = {
  location_id: 'loc-1',
  customer_type: 'recreational',
  customer_group_ids: [],
  segment_ids: [],
  is_first_time: false,
  customer_id: null,
  customer_use_counts: new Map(),
  now: new Date('2026-03-30T14:00:00'),
}

const emptyFilter = {
  strain_ids: [], category_ids: [], brand_ids: [], vendor_ids: [],
  weight_ids: [], product_tag_ids: [], inventory_tag_ids: [],
  pricing_tier_ids: [], product_ids: [],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('evaluateDiscounts', () => {
  it('1. simple percentage: 10% off all products', () => {
    const items = [makeItem({ unit_price: 50 })]
    const discounts = [makeDiscount()]
    const result = evaluateDiscounts(items, discounts, defaultCtx)

    expect(result.applied_discounts).toHaveLength(1)
    expect(result.applied_discounts[0]!.total_savings).toBe(5) // 50 * 10%
    expect(result.total_discount).toBe(5)
  })

  it('2. category-specific: 20% off edibles only', () => {
    const edible = makeItem({ cart_line_id: 'edible', category_id: 'cat-edible', unit_price: 20 })
    const flower = makeItem({ cart_line_id: 'flower', category_id: 'cat-flower', unit_price: 30 })
    const discount = makeDiscount({
      rewards: [{
        id: 'r1', reward_type: 'percentage', value: 20, max_discount_amount: null,
        apply_to: 'each_item',
        filters: [{ ...emptyFilter, category_ids: ['cat-edible'] }],
      }],
    })

    const result = evaluateDiscounts([edible, flower], [discount], defaultCtx)

    expect(result.item_discounts.get('edible')).toBe(4) // 20 * 20%
    expect(result.item_discounts.has('flower')).toBe(false)
  })

  it('3. brand + category AND logic: 15% off Brand X concentrates', () => {
    const match = makeItem({ cart_line_id: 'match', brand_id: 'brandX', category_id: 'cat-conc', unit_price: 40 })
    const wrongBrand = makeItem({ cart_line_id: 'wrong', brand_id: 'brandY', category_id: 'cat-conc', unit_price: 40 })
    const discount = makeDiscount({
      rewards: [{
        id: 'r1', reward_type: 'percentage', value: 15, max_discount_amount: null,
        apply_to: 'each_item',
        filters: [{ ...emptyFilter, brand_ids: ['brandX'], category_ids: ['cat-conc'] }],
      }],
    })

    const result = evaluateDiscounts([match, wrongBrand], [discount], defaultCtx)

    expect(result.item_discounts.get('match')).toBe(6) // 40 * 15%
    expect(result.item_discounts.has('wrong')).toBe(false)
  })

  it('4. min quantity constraint: buy 3 get 10% off', () => {
    const twoItems = [makeItem({ quantity: 2 })]
    const threeItems = [makeItem({ quantity: 3 })]
    const discount = makeDiscount({
      constraints: [{ id: 'c1', min_quantity: 3, min_spend: null, min_weight: null, group_by_sku: false, filters: [] }],
    })

    const fail = evaluateDiscounts(twoItems, [discount], defaultCtx)
    expect(fail.applied_discounts).toHaveLength(0)

    const pass = evaluateDiscounts(threeItems, [discount], defaultCtx)
    expect(pass.applied_discounts).toHaveLength(1)
    expect(pass.total_discount).toBe(3) // 30 * 10%
  })

  it('5. min spend constraint: spend $100 get $10 off', () => {
    const under = [makeItem({ unit_price: 90, quantity: 1 })]
    const over = [makeItem({ unit_price: 110, quantity: 1 })]
    const discount = makeDiscount({
      constraints: [{ id: 'c1', min_quantity: null, min_spend: 100, min_weight: null, group_by_sku: false, filters: [] }],
      rewards: [{ id: 'r1', reward_type: 'fixed_amount', value: 10, max_discount_amount: null, apply_to: 'cart_total', filters: [] }],
    })

    const fail = evaluateDiscounts(under, [discount], defaultCtx)
    expect(fail.total_discount).toBe(0)

    const pass = evaluateDiscounts(over, [discount], defaultCtx)
    expect(pass.total_discount).toBe(10)
  })

  it('6. BOGO: buy 2 prerolls get 1 free (cheapest)', () => {
    const cheap = makeItem({ cart_line_id: 'cheap', unit_price: 8, quantity: 1 })
    const expensive = makeItem({ cart_line_id: 'expensive', unit_price: 12, quantity: 1 })
    const discount = makeDiscount({
      constraints: [{ id: 'c1', min_quantity: 2, min_spend: null, min_weight: null, group_by_sku: false, filters: [] }],
      rewards: [{ id: 'r1', reward_type: 'bogo', value: 1, max_discount_amount: null, apply_to: 'cheapest', filters: [] }],
    })

    const result = evaluateDiscounts([cheap, expensive], [discount], defaultCtx)

    expect(result.item_discounts.get('cheap')).toBe(8) // cheapest is free
    expect(result.item_discounts.has('expensive')).toBe(false)
  })

  it('7. non-stackable: only better discount applies', () => {
    const item = makeItem({ unit_price: 100 })
    const worse = makeDiscount({ id: 'd1', name: '5%', priority: 5, rewards: [{ id: 'r1', reward_type: 'percentage', value: 5, max_discount_amount: null, apply_to: 'each_item', filters: [] }] })
    const better = makeDiscount({ id: 'd2', name: '20%', priority: 10, rewards: [{ id: 'r2', reward_type: 'percentage', value: 20, max_discount_amount: null, apply_to: 'each_item', filters: [] }] })

    const result = evaluateDiscounts([item], [worse, better], defaultCtx)

    // Higher priority (20%) evaluated first, then 5% skipped because non-stackable
    expect(result.applied_discounts).toHaveLength(1)
    expect(result.applied_discounts[0]!.discount_name).toBe('20%')
    expect(result.total_discount).toBe(20)
  })

  it('8. stackable: stacks on top of non-stackable', () => {
    const item = makeItem({ unit_price: 100 })
    const nonStack = makeDiscount({ id: 'd1', name: 'Base', priority: 10, is_stackable: false, rewards: [{ id: 'r1', reward_type: 'percentage', value: 10, max_discount_amount: null, apply_to: 'each_item', filters: [] }] })
    const stackable = makeDiscount({ id: 'd2', name: 'Stack', priority: 5, is_stackable: true, rewards: [{ id: 'r2', reward_type: 'percentage', value: 5, max_discount_amount: null, apply_to: 'each_item', filters: [] }] })

    const result = evaluateDiscounts([item], [nonStack, stackable], defaultCtx)

    expect(result.applied_discounts).toHaveLength(2)
    // 10% = $10, then 5% of $100 = $5 (stacked)
    expect(result.total_discount).toBe(15)
  })

  it('9. location scoping: wrong location, no match', () => {
    const item = makeItem()
    const discount = makeDiscount({ location_ids: ['loc-other'] })
    const result = evaluateDiscounts([item], [discount], defaultCtx)

    expect(result.applied_discounts).toHaveLength(0)
  })

  it('10. customer type: rec-only discount, medical customer', () => {
    const item = makeItem()
    const discount = makeDiscount({ customer_type: 'recreational' })
    const medCtx: DiscountEvaluationContext = { ...defaultCtx, customer_type: 'medical' }

    const result = evaluateDiscounts([item], [discount], medCtx)
    expect(result.applied_discounts).toHaveLength(0)
  })

  it('11. recurring: Tuesday 4-7pm only', () => {
    const item = makeItem()
    const discount = makeDiscount({
      is_recurring: true,
      recurrence_days: [2], // Tuesday
      recurrence_start_time: '16:00',
      recurrence_end_time: '19:00',
    })

    // Tuesday at 5pm
    const tuesdayCtx: DiscountEvaluationContext = { ...defaultCtx, now: new Date('2026-03-31T17:00:00') } // Tuesday
    const tuesdayResult = evaluateDiscounts([item], [discount], tuesdayCtx)
    expect(tuesdayResult.applied_discounts).toHaveLength(1)

    // Tuesday at 10am (outside window)
    const morningCtx: DiscountEvaluationContext = { ...defaultCtx, now: new Date('2026-03-31T10:00:00') }
    const morningResult = evaluateDiscounts([item], [discount], morningCtx)
    expect(morningResult.applied_discounts).toHaveLength(0)
  })

  it('12. price-to-amount: set price to $25 from $30', () => {
    const item = makeItem({ unit_price: 30 })
    const discount = makeDiscount({
      rewards: [{ id: 'r1', reward_type: 'price_to_amount', value: 25, max_discount_amount: null, apply_to: 'each_item', filters: [] }],
    })

    const result = evaluateDiscounts([item], [discount], defaultCtx)
    expect(result.total_discount).toBe(5) // 30 - 25
  })

  it('13. max_discount_amount cap', () => {
    const item = makeItem({ unit_price: 200 })
    const discount = makeDiscount({
      rewards: [{ id: 'r1', reward_type: 'percentage', value: 50, max_discount_amount: 20, apply_to: 'each_item', filters: [] }],
    })

    const result = evaluateDiscounts([item], [discount], defaultCtx)
    // 50% of 200 = 100, but capped at 20
    expect(result.total_discount).toBe(20)
  })
})
