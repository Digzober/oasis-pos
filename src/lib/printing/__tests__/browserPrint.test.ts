import { afterEach, describe, expect, it, vi } from 'vitest'
import { runAutoPrintJobs } from '../browserPrint'
import type { ReceiptData } from '@/lib/receipts/render'

const receipt = {
  transaction_id: 'txn-1', receipt_number: '1', date: '2026-07-14T00:00:00Z',
  location_name: 'Oasis', location_address: '123 Main', location_phone: null,
  license_number: 'NM-1', employee_name: 'Alex', customer_name: null,
  lines: [], discounts: [], taxes: [], payments: [], subtotal: 10,
  discount_total: 0, tax_total: 0, rounding_adjustment: 0, total: 10,
  loyalty_points_earned: null, biotrack_transaction_id: null,
  config: {
    show_location_name: true, show_location_address: true, show_location_phone: true,
    show_license_number: true, show_employee_name: true, show_customer_name: true,
    show_sku: true, show_thc_percentage: true, show_tax_breakdown: true,
    show_discount_details: true, show_loyalty_points: true,
    show_return_policy: true, show_biotrack_id: true,
  },
} satisfies ReceiptData

function printWindow() {
  return {
    document: { write: vi.fn(), close: vi.fn() },
    focus: vi.fn(), print: vi.fn(), close: vi.fn(),
  }
}

describe('automatic sale print jobs', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does nothing when both effective print preferences are false', async () => {
    const fetchMock = vi.fn()
    const open = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', { open })

    await runAutoPrintJobs({
      transactionId: 'txn-1', inventoryItems: [],
      preferences: { autoPrintReceipt: false, autoPrintLabels: false },
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it('prints the configured receipt and existing label flow output', async () => {
    const receiptWindow = printWindow()
    const labelWindow = printWindow()
    const open = vi.fn().mockReturnValueOnce(receiptWindow).mockReturnValueOnce(labelWindow)
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/terminal/receipt/txn-1') {
        return new Response(JSON.stringify({ receipt }), { status: 200 })
      }
      if (url === '/api/labels/templates') {
        return new Response(JSON.stringify({ templates: [{ id: 'tpl-1', is_default: true }] }), { status: 200 })
      }
      return new Response(JSON.stringify({ html: '<div>LABEL</div>' }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', { open })

    await runAutoPrintJobs({
      transactionId: 'txn-1',
      inventoryItems: [{ id: 'inv-1', quantity: 2 }],
      preferences: { autoPrintReceipt: true, autoPrintLabels: true },
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/terminal/receipt/txn-1')
    expect(fetchMock).toHaveBeenCalledWith('/api/labels/generate', expect.objectContaining({ method: 'POST' }))
    const receiptHtml = receiptWindow.document.write.mock.calls[0]?.[0] as string
    const labelHtml = labelWindow.document.write.mock.calls[0]?.[0] as string
    expect(receiptHtml).toContain('Receipt #1')
    expect(labelHtml.match(/LABEL/g)).toHaveLength(2)
    expect(receiptWindow.print).toHaveBeenCalledOnce()
    expect(labelWindow.print).toHaveBeenCalledOnce()
  })
})
