import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { adjustLoyaltyPoints } from '../loyaltyAdjustmentService'

describe('atomic loyalty adjustment writer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates balance and journal mutation to adjust_loyalty_points', async () => {
    const reasonQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: { id: 'reason-1', name: 'Courtesy' } }),
    }
    reasonQuery.select.mockReturnValue(reasonQuery)
    reasonQuery.eq.mockReturnValue(reasonQuery)
    const auditInsert = vi.fn().mockResolvedValue({ error: null })
    const rpc = vi.fn().mockResolvedValue({ data: { new_balance: 12.5 }, error: null })
    const from = vi.fn((table: string) => table === 'loyalty_adjustment_reasons'
      ? reasonQuery
      : { insert: auditInsert })
    mocks.createSupabaseServerClient.mockResolvedValue({ from, rpc })

    const balance = await adjustLoyaltyPoints(
      'customer-1',
      2.5,
      'reason-1',
      'approved',
      'employee-1',
      'org-1',
    )

    expect(balance).toBe(12.5)
    expect(rpc).toHaveBeenCalledWith('adjust_loyalty_points', {
      p_customer: 'customer-1',
      p_org: 'org-1',
      p_delta: 2.5,
      p_reason: 'manual_adjust',
      p_lifetime_delta: 2.5,
      p_adjustment_reason: 'reason-1',
      p_created_by: 'employee-1',
    })
    expect(from).not.toHaveBeenCalledWith('loyalty_balances')
    expect(from).not.toHaveBeenCalledWith('loyalty_transactions')
  })
})
