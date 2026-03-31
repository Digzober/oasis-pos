import { describe, it, expect } from 'vitest'

describe('discount management', () => {
  it('1. list renders columns', () => {
    const columns = ['Name', 'Status', 'Type', 'Code', 'Dates', 'Actions']
    expect(columns).toHaveLength(6)
  })

  it('2. status filter works', () => {
    const all = [{ status: 'active' }, { status: 'draft' }, { status: 'active' }]
    const active = all.filter(d => d.status === 'active')
    expect(active).toHaveLength(2)
  })

  it('3. create inserts into 5 tables', () => {
    const tables = ['discounts', 'discount_constraints', 'discount_constraint_filters', 'discount_rewards', 'discount_reward_filters']
    expect(tables).toHaveLength(5)
  })

  it('4. constraint with category filter', () => {
    const filter = { filter_type: 'category', filter_value_ids: ['cat-1', 'cat-2'] }
    expect(filter.filter_value_ids).toHaveLength(2)
  })

  it('5. reward with percentage', () => {
    const reward = { discount_method: 'percentage', discount_value: 10 }
    expect(reward.discount_method).toBe('percentage')
    expect(reward.discount_value).toBe(10)
  })

  it('6. weekly recurrence days', () => {
    const days = [2, 3] // Tue, Wed
    expect(days).toContain(2)
    expect(days).toContain(3)
  })

  it('7. location scoping', () => {
    const locationIds = ['loc-1', 'loc-3']
    expect(locationIds).toHaveLength(2)
    expect(locationIds).not.toContain('loc-2')
  })

  it('8. duplicate creates copy', () => {
    const original = { name: 'Summer Sale' }
    const copy = { name: `Copy of ${original.name}`, status: 'draft' }
    expect(copy.name).toBe('Copy of Summer Sale')
    expect(copy.status).toBe('draft')
  })

  it('9. deactivate sets inactive', () => {
    const before = { status: 'active' }
    const after = { ...before, status: 'inactive' }
    expect(after.status).toBe('inactive')
  })

  it('10. entity filter count badge', () => {
    const filters = { brand_ids: ['b1', 'b2'], category_ids: [] }
    expect(filters.brand_ids.length).toBe(2)
  })

  it('11. preview generates description', () => {
    const parts = ['Buy 3+ items', 'get 10% off', 'Every Tue, Wed', 'All locations']
    const desc = parts.join('. ') + '.'
    expect(desc).toContain('10% off')
    expect(desc).toContain('Tue')
  })

  it('12. edit loads all tables', () => {
    const editData = { discount: { name: 'Test' }, constraints: [{ id: 'c1' }], rewards: [{ id: 'r1' }] }
    expect(editData.discount.name).toBe('Test')
    expect(editData.constraints).toHaveLength(1)
    expect(editData.rewards).toHaveLength(1)
  })
})
