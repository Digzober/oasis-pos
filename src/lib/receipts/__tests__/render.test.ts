import { describe, expect, it } from 'vitest'
import { buildReceiptBodyHtml, type ReceiptData } from '../render'

const receipt: ReceiptData = {
  transaction_id: 'txn-1', receipt_number: '42', date: '2026-07-14T20:00:00Z',
  location_name: 'Oasis Downtown', location_address: '123 Main St, Albuquerque, NM 87101',
  location_phone: '505-555-0100', license_number: 'NMCCD-1',
  employee_name: 'Alex Cashier', customer_name: 'Jamie Customer',
  lines: [{
    product_name: 'Blue Dream', quantity: 1, unit_price: 10, line_total: 10.80,
    discount_amount: 1, sku: 'SKU-1', thc_percentage: 22.5,
    biotrack_barcode: 'BT-LINE-1',
  }],
  discounts: [{ name: 'Welcome', amount: 1 }],
  taxes: [{ name: 'GRT', rate: 0.08, amount: 0.80 }],
  payments: [{ method: 'cash', amount: 10.80, change: 0.20 }],
  subtotal: 11, discount_total: 1, tax_total: 0.80,
  rounding_adjustment: 0, total: 10.80,
  loyalty_points_earned: 10, biotrack_transaction_id: 'BT-TXN-1',
  config: {
    show_location_name: true, show_location_address: true, show_location_phone: true,
    show_license_number: true, show_employee_name: true, show_customer_name: true,
    show_sku: true, show_thc_percentage: true, show_tax_breakdown: true,
    show_discount_details: true, show_loyalty_points: true,
    show_return_policy: true, show_biotrack_id: true,
  },
}

describe('receipt renderer', () => {
  it('renders every configured receipt field from receipt_config', () => {
    const html = buildReceiptBodyHtml(receipt)

    for (const marker of [
      'Oasis Downtown', '123 Main St', '505-555-0100', 'NMCCD-1',
      'Alex Cashier', 'Jamie Customer', 'SKU-1', 'THC: 22.5%', 'GRT',
      'Welcome', 'Points Earned: 10', 'Returns within 14 days', 'BT-TXN-1',
    ]) expect(html).toContain(marker)
  })

  it('omits fields disabled by receipt_config', () => {
    const config = Object.fromEntries(
      Object.keys(receipt.config).map((key) => [key, false]),
    ) as ReceiptData['config']
    const html = buildReceiptBodyHtml({ ...receipt, config })

    for (const marker of [
      'Oasis Downtown', '123 Main St', 'Alex Cashier', 'Jamie Customer',
      'SKU-1', 'THC: 22.5%', 'GRT', 'Welcome', 'Points Earned',
      'Returns within 14 days', 'BT-TXN-1',
    ]) expect(html).not.toContain(marker)
    expect(html).toContain('Blue Dream')
    expect(html).toContain('TOTAL')
  })

  it('itemizes the cash rounding adjustment once', () => {
    const html = buildReceiptBodyHtml({ ...receipt, rounding_adjustment: -0.05, total: 10.75 })

    expect(html.match(/Rounding adjustment/g)).toHaveLength(1)
    expect(html).toContain('-$0.05')
  })
})
