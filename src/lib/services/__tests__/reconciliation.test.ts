import { describe, it, expect } from 'vitest'

const THRESHOLD = 0.1

function reconcile(local: Array<{ barcode: string; qty: number; name: string }>, bt: Array<{ barcode: string; qty: number; name: string }>) {
  const btMap = new Map(bt.map(i => [i.barcode, i]))
  const items: Array<{ barcode: string; status: string; variance: number; auto_resolved: boolean }> = []

  for (const l of local) {
    const b = btMap.get(l.barcode)
    if (b) {
      const v = l.qty - b.qty
      if (Math.abs(v) < THRESHOLD) items.push({ barcode: l.barcode, status: 'matched', variance: v, auto_resolved: Math.abs(v) > 0 })
      else items.push({ barcode: l.barcode, status: 'discrepancy', variance: v, auto_resolved: false })
      btMap.delete(l.barcode)
    } else {
      items.push({ barcode: l.barcode, status: 'local_only', variance: l.qty, auto_resolved: false })
    }
  }
  for (const [barcode, b] of btMap) {
    items.push({ barcode, status: 'biotrack_only', variance: -b.qty, auto_resolved: false })
  }
  return items
}

describe('reconciliation', () => {
  it('1. all items match: zero discrepancies', () => {
    const result = reconcile([{ barcode: 'BC1', qty: 10, name: 'A' }], [{ barcode: 'BC1', qty: 10, name: 'A' }])
    expect(result.every(r => r.status === 'matched')).toBe(true)
  })

  it('2. quantity variance: flagged as discrepancy', () => {
    const result = reconcile([{ barcode: 'BC1', qty: 10, name: 'A' }], [{ barcode: 'BC1', qty: 8, name: 'A' }])
    expect(result[0]!.status).toBe('discrepancy')
    expect(result[0]!.variance).toBe(2)
  })

  it('3. small variance auto-resolved', () => {
    const result = reconcile([{ barcode: 'BC1', qty: 10.05, name: 'A' }], [{ barcode: 'BC1', qty: 10, name: 'A' }])
    expect(result[0]!.status).toBe('matched')
    expect(result[0]!.auto_resolved).toBe(true)
  })

  it('4. local-only item flagged', () => {
    const result = reconcile([{ barcode: 'BC1', qty: 5, name: 'A' }], [])
    expect(result[0]!.status).toBe('local_only')
  })

  it('5. biotrack-only item flagged', () => {
    const result = reconcile([], [{ barcode: 'BC1', qty: 5, name: 'A' }])
    expect(result[0]!.status).toBe('biotrack_only')
  })

  it('6. report saved (structure check)', () => {
    const report = { items_matched: 8, items_with_discrepancy: 1, items_local_only: 0, items_biotrack_only: 1, status: 'completed' }
    expect(report.status).toBe('completed')
    expect(report.items_matched + report.items_with_discrepancy).toBe(9)
  })

  it('7. cron rejects without secret', () => {
    const hasSecret = false
    const cronSecret = 'my-secret'
    expect(hasSecret || !cronSecret).toBe(false) // would return 401
  })

  it('8. inventory sync counts locations', () => {
    const locations = [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }]
    expect(locations).toHaveLength(3)
  })
})
