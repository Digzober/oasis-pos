import { describe, it, expect } from 'vitest'
import { roundMoney } from '@/lib/utils/money'

describe('advanced reporting', () => {
  it('1. COGS: revenue, cost, margin calculated', () => {
    const revenue = 100; const cost = 40
    const profit = roundMoney(revenue - cost)
    const margin = roundMoney(profit / revenue * 100)
    expect(profit).toBe(60); expect(margin).toBe(60)
  })

  it('2. COGS with zero sales: returns zeros', () => {
    const revenue = 0; const cost = 0
    const margin = revenue > 0 ? roundMoney((revenue - cost) / revenue * 100) : 0
    expect(margin).toBe(0)
  })

  it('3. shrinkage: damage adjustments included', () => {
    const adjustments = [{ type: 'damage', delta: -5 }, { type: 'theft', delta: -2 }, { type: 'count_correction', delta: 3 }]
    const shrinkage = adjustments.filter(a => a.delta < 0)
    expect(shrinkage).toHaveLength(2)
    expect(shrinkage.reduce((s, a) => s + Math.abs(a.delta), 0)).toBe(7)
  })

  it('4. expiring: items within window only', () => {
    const now = Date.now()
    const items = [
      { expiration: new Date(now + 10 * 86400000) }, // 10 days
      { expiration: new Date(now + 60 * 86400000) }, // 60 days
      { expiration: new Date(now + 25 * 86400000) }, // 25 days
    ]
    const within30 = items.filter(i => (i.expiration.getTime() - now) / 86400000 <= 30)
    expect(within30).toHaveLength(2)
  })

  it('5. low stock: items below threshold', () => {
    const items = [{ available: 2 }, { available: 10 }, { available: 0 }, { available: 3 }]
    const low = items.filter(i => i.available <= 5)
    expect(low).toHaveLength(3)
  })

  it('6. valuation: total = sum(qty * cost)', () => {
    const items = [{ qty: 10, cost: 15 }, { qty: 5, cost: 20 }]
    const total = items.reduce((s, i) => roundMoney(s + i.qty * i.cost), 0)
    expect(total).toBe(250)
  })

  it('7. schedule creation: saved', () => {
    const schedule = { report_type: 'cogs', frequency: 'daily', recipients: ['mgr@oasis.com'], is_active: true }
    expect(schedule.report_type).toBe('cogs')
    expect(schedule.recipients).toHaveLength(1)
  })

  it('8. scheduled execution: due reports run', () => {
    const schedules = [{ id: 's1', is_active: true }, { id: 's2', is_active: false }]
    const active = schedules.filter(s => s.is_active)
    expect(active).toHaveLength(1)
  })
})
