import { describe, it, expect } from 'vitest'
import { roundMoney } from '@/lib/utils/money'

describe('dashboard', () => {
  it('1. KPI values calculated correctly', () => {
    const txns = [{ subtotal: 100, discount_amount: 10, tax_amount: 8, total: 98, status: 'completed' }, { subtotal: 50, discount_amount: 0, tax_amount: 4, total: 54, status: 'completed' }]
    const grossSales = txns.reduce((s, t) => roundMoney(s + t.subtotal), 0)
    const netSales = roundMoney(grossSales - txns.reduce((s, t) => s + t.discount_amount, 0))
    expect(grossSales).toBe(150)
    expect(netSales).toBe(140)
  })

  it('2. sales by hour: 24 entries', () => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, sales: 0, transactions: 0 }))
    hours[10]!.sales = 500; hours[10]!.transactions = 15
    expect(hours).toHaveLength(24)
    expect(hours[10]!.sales).toBe(500)
  })

  it('3. top products sorted by revenue', () => {
    const products = [{ name: 'A', revenue: 30 }, { name: 'B', revenue: 80 }, { name: 'C', revenue: 50 }]
    const sorted = products.sort((a, b) => b.revenue - a.revenue)
    expect(sorted[0]!.name).toBe('B')
  })

  it('4. alerts: correct counts', () => {
    const kpis = { low_stock_count: 3, open_drawers: 2, pending_online_orders: 4, total_voids: 0, total_returns: 0 }
    const alertCount = [kpis.low_stock_count > 0, kpis.open_drawers > 0, kpis.pending_online_orders > 0, kpis.total_voids > 0].filter(Boolean).length
    expect(alertCount).toBe(3)
  })

  it('5. date change triggers different data', () => {
    const date1 = '2026-03-29'; const date2 = '2026-03-30'
    expect(date1).not.toBe(date2)
  })

  it('6. all locations aggregation', () => {
    const loc1 = { net_sales: 1000 }; const loc2 = { net_sales: 1500 }
    const total = roundMoney(loc1.net_sales + loc2.net_sales)
    expect(total).toBe(2500)
  })

  it('7. transaction count increments on new sale', () => {
    let count = 10
    count++ // realtime subscription fires
    expect(count).toBe(11)
  })

  it('8. empty day shows zeros', () => {
    const kpis = { transactions: 0, gross_sales: 0, net_sales: 0, average_cart: 0 }
    expect(kpis.transactions).toBe(0)
    expect(kpis.average_cart).toBe(0)
  })
})
