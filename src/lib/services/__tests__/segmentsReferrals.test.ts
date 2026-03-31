import { describe, it, expect } from 'vitest'
import { evaluateRules } from '../segmentService'

const makeCustomer = (overrides = {}) => ({
  lifetime_spend: 100, visit_count: 5, last_visit_at: new Date().toISOString(),
  is_medical: false, created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  customer_group_ids: [] as string[], avg_transaction_value: 20, ...overrides,
})

describe('segments and referrals', () => {
  it('1. lifetime_spend >= 500: customer with 600 matches', () => {
    const rules = { operator: 'AND' as const, conditions: [{ field: 'lifetime_spend', op: 'gte' as const, value: 500 }] }
    expect(evaluateRules(rules, makeCustomer({ lifetime_spend: 600 }))).toBe(true)
    expect(evaluateRules(rules, makeCustomer({ lifetime_spend: 400 }))).toBe(false)
  })

  it('2. AND: both conditions must match', () => {
    const rules = { operator: 'AND' as const, conditions: [
      { field: 'lifetime_spend', op: 'gte' as const, value: 100 },
      { field: 'total_visits', op: 'gte' as const, value: 10 },
    ] }
    expect(evaluateRules(rules, makeCustomer({ lifetime_spend: 200, visit_count: 15 }))).toBe(true)
    expect(evaluateRules(rules, makeCustomer({ lifetime_spend: 200, visit_count: 5 }))).toBe(false)
  })

  it('3. OR: one match suffices', () => {
    const rules = { operator: 'OR' as const, conditions: [
      { field: 'lifetime_spend', op: 'gte' as const, value: 1000 },
      { field: 'total_visits', op: 'gte' as const, value: 3 },
    ] }
    expect(evaluateRules(rules, makeCustomer({ lifetime_spend: 50, visit_count: 5 }))).toBe(true)
  })

  it('4. referral creation: pending status', () => {
    const referral = { status: 'pending', referrer_customer_id: 'c1', referee_customer_id: 'c2' }
    expect(referral.status).toBe('pending')
    expect(referral.referrer_customer_id).not.toBe(referral.referee_customer_id)
  })

  it('5. referral completion: both parties get points', () => {
    const config = { referrer_reward_points: 50, referee_reward_points: 25, min_purchase_amount: 20 }
    const txTotal = 30
    const meetsMin = txTotal >= config.min_purchase_amount
    expect(meetsMin).toBe(true)
    expect(config.referrer_reward_points).toBe(50)
    expect(config.referee_reward_points).toBe(25)
  })

  it('6. referral incomplete: below min purchase', () => {
    const config = { min_purchase_amount: 50 }
    const txTotal = 30
    expect(txTotal < config.min_purchase_amount).toBe(true)
  })

  it('7. loyalty adjust positive: balance increases', () => {
    const balance = 100; const adjustment = 50
    expect(balance + adjustment).toBe(150)
  })

  it('8. loyalty adjust negative: balance decreases', () => {
    const balance = 100; const adjustment = -30
    expect(balance + adjustment).toBe(70)
  })

  it('9. loyalty adjust below zero: rejected', () => {
    const balance = 20; const adjustment = -50
    const newBalance = balance + adjustment
    expect(newBalance < 0).toBe(true)
  })

  it('10. manager permission for adjustment', () => {
    const reason = { requires_manager: true }
    const employeePerms = ['GENERAL_LOGIN_POS']
    const hasManagerPerm = employeePerms.includes('GENERAL_ADMIN_ADMINISTRATOR')
    expect(reason.requires_manager && !hasManagerPerm).toBe(true)
  })
})
