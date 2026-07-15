import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { updateDiscount } from '../discountManagementService'

function createTableMocks() {
  const parentEq = vi.fn().mockResolvedValue({ error: null })
  const parentUpdate = vi.fn().mockReturnValue({ eq: parentEq })
  const parentSingle = vi.fn().mockResolvedValue({ data: { id: 'discount-1' }, error: null })
  const parentSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({ single: parentSingle }),
  })

  const constraintInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'constraint-new' }, error: null }),
    }),
  })
  const rewardInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'reward-new' }, error: null }),
    }),
  })
  const constraintFilterInsert = vi.fn().mockResolvedValue({ error: null })
  const rewardFilterInsert = vi.fn().mockResolvedValue({ error: null })

  const emptyRuleTable = (insert: ReturnType<typeof vi.fn>) => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    insert,
  })
  const filterTable = (insert: ReturnType<typeof vi.fn>) => ({
    delete: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    }),
    insert,
  })

  const tables = {
    discounts: { update: parentUpdate, select: parentSelect },
    discount_constraints: emptyRuleTable(constraintInsert),
    discount_rewards: emptyRuleTable(rewardInsert),
    discount_constraint_filters: filterTable(constraintFilterInsert),
    discount_reward_filters: filterTable(rewardFilterInsert),
  }
  return {
    from: vi.fn((table: keyof typeof tables) => tables[table]),
    constraintInsert,
    rewardInsert,
    constraintFilterInsert,
    rewardFilterInsert,
  }
}

describe('discount rule persistence', () => {
  beforeEach(() => vi.clearAllMocks())

  it('replaces and round-trips every constraint and reward field on edit', async () => {
    const database = createTableMocks()
    mocks.createSupabaseServerClient.mockResolvedValue({ from: database.from })

    await updateDiscount('discount-1', {
      discount: { name: 'Updated' },
      constraints: [{
        threshold: { threshold_type: 'total_spend', min_value: 40, group_by_sku: false },
        filters: [
          { filter_type: 'category', filter_value_ids: ['cat-1'] },
          { filter_type: 'brand', filter_value_ids: ['brand-1'] },
          { filter_type: 'strain', filter_value_ids: ['strain-1'] },
          { filter_type: 'vendor', filter_value_ids: ['vendor-1'] },
          { filter_type: 'weight', filter_value_ids: ['3.5g'] },
        ],
      }],
      rewards: [{
        reward: { discount_method: 'percent_off', discount_value: 20, apply_to: 'cheapest' },
        filters: [
          { filter_type: 'category', filter_value_ids: ['cat-2'] },
          { filter_type: 'brand', filter_value_ids: ['brand-2'] },
          { filter_type: 'strain', filter_value_ids: ['strain-2'] },
          { filter_type: 'vendor', filter_value_ids: ['vendor-2'] },
          { filter_type: 'weight', filter_value_ids: ['7g'] },
        ],
      }],
    })

    expect(database.constraintInsert).toHaveBeenCalledWith({
      threshold_type: 'total_spend', min_value: 40, group_by_sku: false,
      discount_id: 'discount-1',
    })
    expect(database.constraintFilterInsert).toHaveBeenCalledWith([
      { filter_type: 'category', filter_value_ids: ['cat-1'], constraint_id: 'constraint-new' },
      { filter_type: 'brand', filter_value_ids: ['brand-1'], constraint_id: 'constraint-new' },
      { filter_type: 'strain', filter_value_ids: ['strain-1'], constraint_id: 'constraint-new' },
      { filter_type: 'vendor', filter_value_ids: ['vendor-1'], constraint_id: 'constraint-new' },
      { filter_type: 'weight', filter_value_ids: ['3.5g'], constraint_id: 'constraint-new' },
    ])
    expect(database.rewardInsert).toHaveBeenCalledWith({
      discount_method: 'percent_off', discount_value: 20, apply_to: 'cheapest',
      discount_id: 'discount-1',
    })
    expect(database.rewardFilterInsert).toHaveBeenCalledWith([
      { filter_type: 'category', filter_value_ids: ['cat-2'], reward_id: 'reward-new' },
      { filter_type: 'brand', filter_value_ids: ['brand-2'], reward_id: 'reward-new' },
      { filter_type: 'strain', filter_value_ids: ['strain-2'], reward_id: 'reward-new' },
      { filter_type: 'vendor', filter_value_ids: ['vendor-2'], reward_id: 'reward-new' },
      { filter_type: 'weight', filter_value_ids: ['7g'], reward_id: 'reward-new' },
    ])
  })
})
