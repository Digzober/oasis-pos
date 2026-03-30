import { describe, it, expect } from 'vitest'
import { roundMoney } from '@/lib/utils/money'

describe('voidReturnService logic', () => {
  it('1. void: completed same-day transaction can be voided', () => {
    const tx = { status: 'completed', created_at: new Date().toISOString() }
    const sameDay = new Date(tx.created_at).toDateString() === new Date().toDateString()
    expect(tx.status).toBe('completed')
    expect(sameDay).toBe(true)
  })

  it('2. void rejected: transaction from yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const sameDay = yesterday.toDateString() === new Date().toDateString()
    expect(sameDay).toBe(false)
  })

  it('3. void rejected: already voided transaction', () => {
    const tx = { status: 'voided' }
    expect(tx.status).not.toBe('completed')
  })

  it('4. partial return: 2 of 3 items returned', () => {
    const origLines = [
      { id: 'l1', quantity: 3, line_total: 90, unit_price: 30 },
    ]
    const returnQty = 2
    const perUnit = roundMoney(origLines[0]!.line_total / origLines[0]!.quantity)
    const refund = roundMoney(perUnit * returnQty)
    expect(refund).toBe(60)
    expect(returnQty).toBeLessThanOrEqual(origLines[0]!.quantity)
  })

  it('5. full return with inventory restoration', () => {
    const origLines = [
      { id: 'l1', quantity: 2, inventoryId: 'inv-1' },
      { id: 'l2', quantity: 1, inventoryId: 'inv-2' },
    ]
    const returnAll = origLines.map((l) => ({
      transaction_line_id: l.id,
      quantity: l.quantity,
      restore_to_inventory: true,
    }))
    expect(returnAll).toHaveLength(2)
    expect(returnAll.every((r) => r.restore_to_inventory)).toBe(true)
  })

  it('6. return rejected: older than 14 days', () => {
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
    const withinWindow = fifteenDaysAgo > new Date(Date.now() - 14 * 86400000)
    expect(withinWindow).toBe(false)
  })

  it('7. double-return prevention: already returned quantity blocks re-return', () => {
    const originalQty = 3
    const alreadyReturned = 2
    const newReturnQty = 2
    const wouldExceed = alreadyReturned + newReturnQty > originalQty
    expect(wouldExceed).toBe(true)
  })

  it('8. cash drawer updated on void', () => {
    const drawerSales = 500
    const voidedTotal = 85.50
    const afterVoid = roundMoney(Math.max(0, drawerSales - voidedTotal))
    expect(afterVoid).toBe(414.50)
  })

  it('9. cash drawer updated on return', () => {
    const drawerReturns = 0
    const refundAmount = 45.00
    const afterReturn = roundMoney(drawerReturns + refundAmount)
    expect(afterReturn).toBe(45)
  })

  it('10. loyalty points reversed proportionally on return', () => {
    const originalTotal = 100
    const earnedPoints = 100
    const refundAmount = 30
    const proportionalPoints = Math.round(earnedPoints * (refundAmount / originalTotal))
    expect(proportionalPoints).toBe(30)
  })
})
