import { describe, it, expect } from 'vitest'
import { calculateTaxes } from '../taxCalculator'
import type { TaxLineItem, TaxRateConfig } from '../tax.types'

const CANNABIS_TAX_CAT = 'cat-cannabis'
const NON_CANNABIS_TAX_CAT = 'cat-non-cannabis'

const rates: TaxRateConfig[] = [
  {
    id: 'rate-excise',
    name: 'NM Cannabis Excise Tax',
    rate_percent: 0.12,
    is_excise: true,
    applies_to: 'recreational',
    tax_category_id: CANNABIS_TAX_CAT,
  },
  {
    id: 'rate-grt',
    name: 'Albuquerque GRT',
    rate_percent: 0.079375,
    is_excise: false,
    applies_to: 'both',
    tax_category_id: null, // null matches all categories
  },
  {
    id: 'rate-med-grt',
    name: 'Medical GRT',
    rate_percent: 0.05,
    is_excise: false,
    applies_to: 'medical',
    tax_category_id: CANNABIS_TAX_CAT,
  },
]

describe('calculateTaxes', () => {
  it('applies excise and GRT for recreational cannabis', () => {
    const items: TaxLineItem[] = [
      { product_id: 'p1', tax_category_id: CANNABIS_TAX_CAT, is_medical: false, taxable_amount: 50, quantity: 1 },
    ]

    const result = calculateTaxes(items, rates)

    expect(result.line_taxes).toHaveLength(1)
    const line = result.line_taxes[0]

    // Excise: 50 * 0.12 = 6.00
    expect(line.excise_amount).toBe(6)
    // GRT (null category matches): 50 * 0.079375 = 3.97
    expect(line.grt_amount).toBe(3.97)
    expect(line.total_tax).toBe(9.97)
    expect(line.applied_rates).toHaveLength(2)

    expect(result.summary.total_excise).toBe(6)
    expect(result.summary.total_grt).toBe(3.97)
    expect(result.summary.total_tax).toBe(9.97)
  })

  it('excludes excise for medical cannabis, applies medical-specific rates', () => {
    const items: TaxLineItem[] = [
      { product_id: 'p1', tax_category_id: CANNABIS_TAX_CAT, is_medical: true, taxable_amount: 50, quantity: 1 },
    ]

    const result = calculateTaxes(items, rates)

    const line = result.line_taxes[0]
    // Excise is rec-only, should NOT apply
    expect(line.excise_amount).toBe(0)
    // GRT (both): 50 * 0.079375 = 3.97
    // Medical GRT: 50 * 0.05 = 2.50
    expect(line.grt_amount).toBe(6.47)
    expect(line.applied_rates).toHaveLength(2)
    expect(line.applied_rates.some((r) => r.name === 'NM Cannabis Excise Tax')).toBe(false)
  })

  it('applies only matching tax category rates for non-cannabis', () => {
    const items: TaxLineItem[] = [
      { product_id: 'p1', tax_category_id: NON_CANNABIS_TAX_CAT, is_medical: false, taxable_amount: 20, quantity: 1 },
    ]

    const result = calculateTaxes(items, rates)
    const line = result.line_taxes[0]

    // Only null-category GRT matches non-cannabis
    expect(line.applied_rates).toHaveLength(1)
    expect(line.applied_rates[0].name).toBe('Albuquerque GRT')
    // 20 * 0.079375 = 1.59
    expect(line.total_tax).toBe(1.59)
  })

  it('returns zero totals for empty items', () => {
    const result = calculateTaxes([], rates)

    expect(result.line_taxes).toHaveLength(0)
    expect(result.summary.total_tax).toBe(0)
    expect(result.summary.total_excise).toBe(0)
    expect(result.summary.total_grt).toBe(0)
    expect(result.summary.effective_rate).toBe(0)
  })

  it('handles multiple items with different tax categories', () => {
    const items: TaxLineItem[] = [
      { product_id: 'flower', tax_category_id: CANNABIS_TAX_CAT, is_medical: false, taxable_amount: 30, quantity: 1 },
      { product_id: 'pipe', tax_category_id: NON_CANNABIS_TAX_CAT, is_medical: false, taxable_amount: 15, quantity: 2 },
    ]

    const result = calculateTaxes(items, rates)

    expect(result.line_taxes).toHaveLength(2)

    // Flower: excise 30*0.12=3.60, GRT 30*0.079375=2.38 → 5.98
    expect(result.line_taxes[0].total_tax).toBe(5.98)
    // Pipe: GRT only 30*0.079375=2.38
    expect(result.line_taxes[1].total_tax).toBe(2.38)

    expect(result.summary.total_excise).toBe(3.6)
    expect(result.summary.total_grt).toBe(4.76)
    expect(result.summary.total_tax).toBe(8.36)
  })

  it('rounds correctly with 3 items at $33.33 and 12% tax', () => {
    const simpleRates: TaxRateConfig[] = [
      { id: 'r1', name: 'Tax', rate_percent: 0.12, is_excise: false, applies_to: 'both', tax_category_id: null },
    ]
    const items: TaxLineItem[] = [
      { product_id: 'a', tax_category_id: 'cat-x', is_medical: false, taxable_amount: 33.33, quantity: 1 },
      { product_id: 'b', tax_category_id: 'cat-x', is_medical: false, taxable_amount: 33.33, quantity: 1 },
      { product_id: 'c', tax_category_id: 'cat-x', is_medical: false, taxable_amount: 33.33, quantity: 1 },
    ]

    const result = calculateTaxes(items, simpleRates)

    // Each: 33.33 * 0.12 = 3.9996 → rounded to 4.00
    for (const line of result.line_taxes) {
      expect(line.total_tax).toBe(4)
    }
    expect(result.summary.total_tax).toBe(12)
  })

  it('handles zero-price item without NaN effective rate', () => {
    const items: TaxLineItem[] = [
      { product_id: 'free', tax_category_id: CANNABIS_TAX_CAT, is_medical: false, taxable_amount: 0, quantity: 1 },
    ]

    const result = calculateTaxes(items, rates)

    expect(result.summary.total_tax).toBe(0)
    expect(result.summary.effective_rate).toBe(0)
    expect(Number.isNaN(result.summary.effective_rate)).toBe(false)
  })

  it('treats negative taxable_amount as zero', () => {
    const items: TaxLineItem[] = [
      { product_id: 'p1', tax_category_id: CANNABIS_TAX_CAT, is_medical: false, taxable_amount: -5, quantity: 1 },
    ]

    const result = calculateTaxes(items, rates)

    expect(result.line_taxes[0].total_tax).toBe(0)
    expect(result.summary.total_tax).toBe(0)
  })
})
