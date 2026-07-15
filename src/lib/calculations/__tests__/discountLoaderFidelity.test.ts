import { describe, expect, it } from 'vitest'
import { mapDiscountRow } from '../discountLoader'

describe('discount loader fidelity', () => {
  it('loads all customer types, recurrence fields, thresholds, rewards, and filter types', () => {
    const loaded = mapDiscountRow({
      id: 'discount-1',
      name: 'Full fidelity',
      application_method: 'automatic',
      customer_types: ['recreational', 'medical'],
      weekly_recurrence: [1, 3, 5],
      recurrence_start_time: '09:00',
      recurrence_end_time: '17:00',
      discount_constraints: [{
        id: 'constraint-1',
        threshold_type: 'total_spend',
        min_value: 50,
        group_by_sku: false,
        discount_constraint_filters: [
          { filter_type: 'vendor', filter_value_ids: ['vendor-1'] },
          { filter_type: 'weight', filter_value_ids: ['3.5g'] },
          { filter_type: 'product_tag', filter_value_ids: ['tag-1'] },
          { filter_type: 'inventory_tag', filter_value_ids: ['tag-2'] },
          { filter_type: 'pricing_tier', filter_value_ids: ['tier-1'] },
          { filter_type: 'product', filter_value_ids: ['product-1'] },
        ],
      }],
      discount_rewards: [{
        id: 'reward-1',
        discount_method: 'percent_off',
        discount_value: 15,
        apply_to: 'cheapest',
        discount_reward_filters: [
          { filter_type: 'category', filter_value_ids: ['category-1'] },
          { filter_type: 'brand', filter_value_ids: ['brand-1'] },
          { filter_type: 'strain', filter_value_ids: ['strain-1'] },
        ],
      }],
    })

    expect(loaded.customer_types).toEqual(['recreational', 'medical'])
    expect(loaded).toMatchObject({
      is_recurring: true,
      recurrence_days: [1, 3, 5],
      recurrence_start_time: '09:00',
      recurrence_end_time: '17:00',
    })
    expect(loaded.constraints[0]).toMatchObject({
      min_quantity: null,
      min_spend: 50,
      min_weight: null,
    })
    expect(loaded.constraints[0]?.filters).toHaveLength(6)
    expect(loaded.rewards[0]).toMatchObject({
      reward_type: 'percentage',
      value: 15,
      apply_to: 'cheapest',
    })
    expect(loaded.rewards[0]?.filters).toHaveLength(3)
  })
})
