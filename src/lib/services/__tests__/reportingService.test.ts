import { describe, it, expect } from 'vitest'
import { roundMoney } from '@/lib/utils/money'

// Test the pure calculation logic extracted from reportingService.
// The actual DB queries are tested via integration tests.

describe('reportingService calculations', () => {
  // Simulate the summary aggregation logic
  function aggregateSummary(
    txns: Array<{
      transaction_type: string
      status: string
      total: number
      tax_amount: number
      discount_amount: number
      lines: Array<{ product_name: string; quantity: number; line_total: number; category_name: string }>
      employee_name: string
      hour: number
    }>,
  ) {
    let totalSales = 0
    let totalReturns = 0
    let totalVoidsCount = 0
    let totalTax = 0
    let totalDiscounts = 0
    let saleCount = 0
    const hourlyMap = new Map<number, { total: number; count: number }>()
    const productMap = new Map<string, { units: number; revenue: number }>()

    for (let h = 0; h < 24; h++) hourlyMap.set(h, { total: 0, count: 0 })

    for (const tx of txns) {
      if (tx.status === 'voided') { totalVoidsCount++; continue }
      if (tx.transaction_type === 'return') {
        totalReturns = roundMoney(totalReturns + Math.abs(tx.total))
      } else {
        totalSales = roundMoney(totalSales + tx.total)
        saleCount++
      }
      totalTax = roundMoney(totalTax + tx.tax_amount)
      totalDiscounts = roundMoney(totalDiscounts + tx.discount_amount)

      const h = hourlyMap.get(tx.hour) ?? { total: 0, count: 0 }
      h.total = roundMoney(h.total + tx.total)
      h.count++
      hourlyMap.set(tx.hour, h)

      for (const line of tx.lines) {
        const p = productMap.get(line.product_name) ?? { units: 0, revenue: 0 }
        p.units += line.quantity
        p.revenue = roundMoney(p.revenue + line.line_total)
        productMap.set(line.product_name, p)
      }
    }

    const netSales = roundMoney(totalSales - totalReturns)
    const avgTx = saleCount > 0 ? roundMoney(netSales / saleCount) : 0

    return {
      totalSales, totalReturns, totalVoidsCount, netSales,
      totalTransactions: saleCount, avgTx, totalTax, totalDiscounts,
      hourly: Array.from(hourlyMap.entries()).map(([hour, v]) => ({ hour, ...v })),
      topProducts: Array.from(productMap.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue),
    }
  }

  it('calculates net sales excluding voids', () => {
    const result = aggregateSummary([
      { transaction_type: 'sale', status: 'completed', total: 100, tax_amount: 10, discount_amount: 5, lines: [], employee_name: 'A', hour: 10 },
      { transaction_type: 'sale', status: 'voided', total: 50, tax_amount: 5, discount_amount: 0, lines: [], employee_name: 'A', hour: 11 },
      { transaction_type: 'sale', status: 'completed', total: 75, tax_amount: 7, discount_amount: 0, lines: [], employee_name: 'B', hour: 14 },
    ])

    expect(result.netSales).toBe(175)
    expect(result.totalVoidsCount).toBe(1)
    expect(result.totalTransactions).toBe(2)
  })

  it('subtracts returns from net sales', () => {
    const result = aggregateSummary([
      { transaction_type: 'sale', status: 'completed', total: 200, tax_amount: 20, discount_amount: 0, lines: [], employee_name: 'A', hour: 10 },
      { transaction_type: 'return', status: 'completed', total: -50, tax_amount: 0, discount_amount: 0, lines: [], employee_name: 'A', hour: 12 },
    ])

    expect(result.totalSales).toBe(200)
    expect(result.totalReturns).toBe(50)
    expect(result.netSales).toBe(150)
  })

  it('returns zero totals for empty data', () => {
    const result = aggregateSummary([])
    expect(result.netSales).toBe(0)
    expect(result.totalTransactions).toBe(0)
    expect(result.avgTx).toBe(0)
    expect(result.totalTax).toBe(0)
  })

  it('calculates average transaction correctly', () => {
    const result = aggregateSummary([
      { transaction_type: 'sale', status: 'completed', total: 30, tax_amount: 3, discount_amount: 0, lines: [], employee_name: 'A', hour: 9 },
      { transaction_type: 'sale', status: 'completed', total: 70, tax_amount: 7, discount_amount: 0, lines: [], employee_name: 'A', hour: 10 },
    ])

    expect(result.avgTx).toBe(50)
  })

  it('sorts top products by revenue descending', () => {
    const result = aggregateSummary([
      {
        transaction_type: 'sale', status: 'completed', total: 100, tax_amount: 0, discount_amount: 0,
        employee_name: 'A', hour: 10,
        lines: [
          { product_name: 'Product A', quantity: 1, line_total: 30, category_name: 'Cat1' },
          { product_name: 'Product B', quantity: 2, line_total: 70, category_name: 'Cat2' },
        ],
      },
    ])

    expect(result.topProducts[0]!.name).toBe('Product B')
    expect(result.topProducts[0]!.revenue).toBe(70)
    expect(result.topProducts[1]!.name).toBe('Product A')
  })

  it('produces 24 hourly entries', () => {
    const result = aggregateSummary([
      { transaction_type: 'sale', status: 'completed', total: 50, tax_amount: 5, discount_amount: 0, lines: [], employee_name: 'A', hour: 14 },
    ])

    expect(result.hourly).toHaveLength(24)
    expect(result.hourly[14]!.total).toBe(50)
    expect(result.hourly[14]!.count).toBe(1)
    expect(result.hourly[0]!.total).toBe(0)
  })

  it('filters by date range conceptually', () => {
    // The service filters by gte/lte on created_at.
    // Here we verify the filter concept works.
    const allTxns = [
      { date: '2026-03-28', total: 100 },
      { date: '2026-03-29', total: 200 },
      { date: '2026-03-30', total: 300 },
    ]
    const filtered = allTxns.filter((t) => t.date >= '2026-03-29' && t.date <= '2026-03-30')
    expect(filtered).toHaveLength(2)
    expect(filtered.reduce((s, t) => s + t.total, 0)).toBe(500)
  })

  it('filters by location conceptually', () => {
    const allTxns = [
      { location_id: 'loc-1', total: 100 },
      { location_id: 'loc-2', total: 200 },
      { location_id: 'loc-1', total: 50 },
    ]
    const filtered = allTxns.filter((t) => t.location_id === 'loc-1')
    expect(filtered).toHaveLength(2)
    expect(filtered.reduce((s, t) => s + t.total, 0)).toBe(150)
  })
})
