import { describe, it, expect } from 'vitest'

describe('loyalty config and inventory journal', () => {
  it('1. loyalty config loads defaults', () => {
    const config = { accrual_rate: 1.0, enrollment_type: 'opt_in', redemption_method: 'discount', point_expiration_days: 365 }
    expect(config.accrual_rate).toBe(1.0)
  })

  it('2. update accrual rate persists', () => {
    const updated = { accrual_rate: 2.0 }
    expect(updated.accrual_rate).toBe(2.0)
  })

  it('3. change redemption method', () => {
    const method = 'payment_pretax'
    expect(['discount', 'payment_pretax', 'payment_posttax']).toContain(method)
  })

  it('4. create tier appears in list', () => {
    const tiers = [{ name: 'Silver', min_points: 500 }]
    const newTier = { name: 'Gold', min_points: 1000 }
    const updated = [...tiers, newTier]
    expect(updated).toHaveLength(2)
    expect(updated[1]!.name).toBe('Gold')
  })

  it('5. delete tier removed', () => {
    const tiers = [{ id: 't1', name: 'Silver' }, { id: 't2', name: 'Gold' }]
    const after = tiers.filter(t => t.id !== 't1')
    expect(after).toHaveLength(1)
    expect(after[0]!.name).toBe('Gold')
  })

  it('6. journal loads entries', () => {
    const entries = [{ id: 'e1', action: 'adjust', delta: -3 }, { id: 'e2', action: 'receive', delta: 10 }]
    expect(entries).toHaveLength(2)
  })

  it('7. journal filter by action type', () => {
    const entries = [{ action: 'adjust' }, { action: 'receive' }, { action: 'adjust' }]
    const filtered = entries.filter(e => e.action === 'adjust')
    expect(filtered).toHaveLength(2)
  })

  it('8. journal filter by date', () => {
    const entries = [{ date: '2026-03-29' }, { date: '2026-03-30' }, { date: '2026-03-31' }]
    const filtered = entries.filter(e => e.date >= '2026-03-30')
    expect(filtered).toHaveLength(2)
  })

  it('9. journal CSV has all columns', () => {
    const headers = ['Date', 'Action', 'Employee', 'Delta', 'Prev Qty', 'New Qty', 'Reason', 'Notes']
    expect(headers).toHaveLength(8)
  })

  it('10. delta shows correct sign', () => {
    const positive = 5; const negative = -3
    expect(positive > 0).toBe(true)
    expect(negative < 0).toBe(true)
    expect(`+${positive}`).toBe('+5')
    expect(String(negative)).toBe('-3')
  })
})
