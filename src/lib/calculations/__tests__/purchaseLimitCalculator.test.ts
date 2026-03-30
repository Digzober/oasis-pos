import { describe, it, expect } from 'vitest'
import { checkPurchaseLimit } from '../purchaseLimitCalculator'
import type { PurchaseLimitConfig, PurchaseLimitItem } from '../purchaseLimit.types'

const OZ = 28.35

const defaultLimits: PurchaseLimitConfig[] = [
  { category_type: 'flower', customer_type: 'recreational', limit_amount: 2.0, equivalency_ratio: 1.0, time_period: 'per_transaction' },
  { category_type: 'concentrate', customer_type: 'recreational', limit_amount: 2.0, equivalency_ratio: 3.54375, time_period: 'per_transaction' },
  { category_type: 'edible', customer_type: 'recreational', limit_amount: 2.0, equivalency_ratio: 0.035, time_period: 'per_transaction' },
]

function flowerItem(grams: number, qty = 1): PurchaseLimitItem {
  return { product_id: `flower-${grams}`, purchase_limit_category: 'flower', quantity: qty, weight_grams: grams, thc_mg: null, is_medical: false }
}

function concItem(grams: number, qty = 1): PurchaseLimitItem {
  return { product_id: `conc-${grams}`, purchase_limit_category: 'concentrate', quantity: qty, weight_grams: grams, thc_mg: null, is_medical: false }
}

function edibleItem(thcMg: number, qty = 1): PurchaseLimitItem {
  return { product_id: `edible-${thcMg}`, purchase_limit_category: 'edible', quantity: qty, weight_grams: 0, thc_mg: thcMg, is_medical: false }
}

describe('checkPurchaseLimit', () => {
  it('1. 1oz flower = 50% of limit, allowed', () => {
    const result = checkPurchaseLimit([flowerItem(OZ)], defaultLimits, 'recreational')
    expect(result.allowed).toBe(true)
    expect(result.current_flower_equivalent_oz).toBeCloseTo(1.0, 2)
    expect(result.percentage_used).toBeCloseTo(50, 0)
  })

  it('2. 2oz flower = 100% of limit, allowed', () => {
    const result = checkPurchaseLimit([flowerItem(OZ * 2)], defaultLimits, 'recreational')
    expect(result.allowed).toBe(true)
    expect(result.current_flower_equivalent_oz).toBeCloseTo(2.0, 2)
    expect(result.percentage_used).toBeCloseTo(100, 0)
  })

  it('3. 57g flower exceeds limit, NOT allowed', () => {
    const result = checkPurchaseLimit([flowerItem(57)], defaultLimits, 'recreational')
    expect(result.allowed).toBe(false)
    expect(result.current_flower_equivalent_oz).toBeGreaterThan(2.0)
  })

  it('4. 8g concentrate = 1oz equivalent, 16g = 2oz (at limit)', () => {
    // 8g conc * 3.54375 ratio / 28.35 = ~1.0 oz
    const result8 = checkPurchaseLimit([concItem(8)], defaultLimits, 'recreational')
    expect(result8.allowed).toBe(true)
    expect(result8.current_flower_equivalent_oz).toBeCloseTo(1.0, 1)

    const result16 = checkPurchaseLimit([concItem(16)], defaultLimits, 'recreational')
    expect(result16.allowed).toBe(true)
    expect(result16.current_flower_equivalent_oz).toBeCloseTo(2.0, 1)
  })

  it('5. 800mg THC edible = 1oz equivalent', () => {
    const result = checkPurchaseLimit([edibleItem(800)], defaultLimits, 'recreational')
    expect(result.allowed).toBe(true)
    expect(result.current_flower_equivalent_oz).toBeCloseTo(1.0, 2)
  })

  it('6. mixed cart at exactly 2oz: 1oz flower + 4g conc + 400mg edible', () => {
    const items = [
      flowerItem(OZ),          // 1.0 oz
      concItem(4),             // ~0.5 oz
      edibleItem(400),         // 0.5 oz
    ]
    const result = checkPurchaseLimit(items, defaultLimits, 'recreational')
    expect(result.allowed).toBe(true)
    expect(result.current_flower_equivalent_oz).toBeCloseTo(2.0, 1)
  })

  it('7. mixed cart exceeding limit', () => {
    const items = [
      flowerItem(OZ * 1.5),    // 1.5 oz
      concItem(8),             // ~1.0 oz
    ]
    const result = checkPurchaseLimit(items, defaultLimits, 'recreational')
    expect(result.allowed).toBe(false)
    expect(result.current_flower_equivalent_oz).toBeGreaterThan(2.0)
    expect(result.message).toContain('Exceeds')
  })

  it('8. non-cannabis item does not count toward limit', () => {
    const items = [
      flowerItem(OZ),
      { product_id: 'grinder', purchase_limit_category: 'accessory' as const, quantity: 1, weight_grams: 100, thc_mg: null, is_medical: false },
    ]
    const result = checkPurchaseLimit(items, defaultLimits, 'recreational')
    expect(result.allowed).toBe(true)
    expect(result.current_flower_equivalent_oz).toBeCloseTo(1.0, 2)
    // Grinder should not appear in breakdown
    expect(result.breakdown.find((b) => b.product_id === 'grinder')).toBeUndefined()
  })

  it('9. medical customer always allowed', () => {
    const items = [flowerItem(200)] // way over any limit
    const result = checkPurchaseLimit(items, defaultLimits, 'medical')
    expect(result.allowed).toBe(true)
    expect(result.message).toContain('BioTrack')
  })

  it('10. empty cart: allowed, 0% used', () => {
    const result = checkPurchaseLimit([], defaultLimits, 'recreational')
    expect(result.allowed).toBe(true)
    expect(result.current_flower_equivalent_oz).toBe(0)
    expect(result.percentage_used).toBe(0)
  })
})
