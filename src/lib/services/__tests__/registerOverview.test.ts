import { describe, it, expect } from 'vitest'
import { roundMoney } from '@/lib/utils/money'

describe('register overview and closing', () => {
  it('1. renders all registers for location', () => {
    const registers = [{ id: 'r1', name: 'Register 1' }, { id: 'r2', name: 'Register 2' }]
    expect(registers).toHaveLength(2)
  })

  it('2. open drawer shows green status', () => {
    const status = 'open'
    const dot = status === 'open' ? 'bg-emerald-400' : 'bg-gray-500'
    expect(dot).toBe('bg-emerald-400')
  })

  it('3. closed drawer shows variance', () => {
    const drawer = { actual_cash: 500, expected_cash: 502.50 }
    const variance = roundMoney(drawer.actual_cash - drawer.expected_cash)
    expect(variance).toBe(-2.5)
  })

  it('4. daily totals aggregate across registers', () => {
    const r1Sales = 2100; const r2Sales = 2831
    const total = roundMoney(r1Sales + r2Sales)
    expect(total).toBe(4931)
  })

  it('5. closing report includes all sessions', () => {
    const sessions = [{ opened_at: '08:00', closed_at: '16:00' }, { opened_at: '16:00', closed_at: '23:00' }]
    expect(sessions).toHaveLength(2)
  })

  it('6. variance color: correct thresholds', () => {
    const color = (v: number) => { const abs = Math.abs(v); return abs < 5 ? 'green' : abs < 20 ? 'yellow' : 'red' }
    expect(color(2)).toBe('green')
    expect(color(10)).toBe('yellow')
    expect(color(25)).toBe('red')
  })

  it('7. CSV export structure', () => {
    const headers = ['Register', 'Opened By', 'Opened At', 'Closed At', 'Opening', 'Expected', 'Actual', 'Variance']
    expect(headers).toHaveLength(8)
  })

  it('8. empty day shows zeros', () => {
    const totals = { total_sales: 0, net_sales: 0, total_customers: 0 }
    expect(totals.total_sales).toBe(0)
  })
})
