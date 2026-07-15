import { describe, expect, it } from 'vitest'
import { calculateCashRounding, calculatePaymentTotal } from '@/lib/calculations/cashRounding'
import type { RoundingMethod } from '@/lib/calculations/cashRounding'

describe('calculateCashRounding', () => {
  it.each<[RoundingMethod, number]>([
    ['none', 10.13],
    ['round_up_025', 10.25],
    ['round_up_050', 10.50],
    ['round_up_100', 11.00],
    ['round_down_025', 10.00],
    ['round_down_050', 10.00],
    ['round_down_100', 10.00],
    ['round_nearest_005', 10.15],
    ['round_nearest_010', 10.10],
    ['round_nearest_025', 10.25],
    ['round_nearest_050', 10.00],
  ])('applies %s once to a cash total', (method, expectedTotal) => {
    const result = calculateCashRounding(10.13, method)

    expect(result.total).toBe(expectedTotal)
    expect(result.adjustment).toBeCloseTo(expectedTotal - 10.13, 2)
  })

  it('rounds from integer cents to avoid floating-point drift', () => {
    expect(calculateCashRounding(0.1 + 0.2, 'round_nearest_005')).toEqual({
      total: 0.30,
      adjustment: 0,
    })
  })

  it('applies the configured method only to cash payments', () => {
    expect(calculatePaymentTotal(10.13, 'cash', 'round_up_100')).toEqual({
      total: 11,
      adjustment: 0.87,
    })
    expect(calculatePaymentTotal(10.13, 'credit', 'round_up_100')).toEqual({
      total: 10.13,
      adjustment: 0,
    })
  })
})
