import type { EffectiveSettings } from '@/lib/settings/schema'

export type RoundingMethod = EffectiveSettings['checkout']['rounding_method']

type RoundingRule = { incrementCents: number; mode: 'up' | 'down' | 'nearest' }

const ROUNDING_RULES: Record<Exclude<RoundingMethod, 'none'>, RoundingRule> = {
  round_up_025: { incrementCents: 25, mode: 'up' },
  round_up_050: { incrementCents: 50, mode: 'up' },
  round_up_100: { incrementCents: 100, mode: 'up' },
  round_down_025: { incrementCents: 25, mode: 'down' },
  round_down_050: { incrementCents: 50, mode: 'down' },
  round_down_100: { incrementCents: 100, mode: 'down' },
  round_nearest_005: { incrementCents: 5, mode: 'nearest' },
  round_nearest_010: { incrementCents: 10, mode: 'nearest' },
  round_nearest_025: { incrementCents: 25, mode: 'nearest' },
  round_nearest_050: { incrementCents: 50, mode: 'nearest' },
}

function applyRule(cents: number, rule: RoundingRule): number {
  const units = cents / rule.incrementCents
  if (rule.mode === 'up') return Math.ceil(units) * rule.incrementCents
  if (rule.mode === 'down') return Math.floor(units) * rule.incrementCents
  return Math.round(units) * rule.incrementCents
}

export function calculateCashRounding(
  amount: number,
  method: RoundingMethod,
): { total: number; adjustment: number } {
  const cents = Math.round((amount + Number.EPSILON) * 100)
  const roundedCents = method === 'none' ? cents : applyRule(cents, ROUNDING_RULES[method])
  return {
    total: roundedCents / 100,
    adjustment: (roundedCents - cents) / 100,
  }
}

export function calculatePaymentTotal(
  amount: number,
  paymentMethod: string,
  roundingMethod: RoundingMethod,
): { total: number; adjustment: number } {
  return paymentMethod === 'cash'
    ? calculateCashRounding(amount, roundingMethod)
    : calculateCashRounding(amount, 'none')
}
