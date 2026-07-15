import type { ReceiptDisplaySettings } from './config'

export interface ReceiptLine {
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
  discount_amount: number
  sku: string | null
  thc_percentage: number | null
  biotrack_barcode: string | null
}

export interface ReceiptData {
  transaction_id: string
  receipt_number: string
  date: string
  location_name: string
  location_address: string
  location_phone: string | null
  license_number: string
  employee_name: string
  customer_name: string | null
  lines: ReceiptLine[]
  discounts: Array<{ name: string; amount: number }>
  taxes: Array<{ name: string; rate: number; amount: number }>
  payments: Array<{ method: string; amount: number; change: number }>
  subtotal: number
  discount_total: number
  tax_total: number
  rounding_adjustment: number
  total: number
  loyalty_points_earned: number | null
  biotrack_transaction_id: string | null
  config: ReceiptDisplaySettings
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]!)
}

function money(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function row(label: string, value: string, className = 'row'): string {
  return `<div class="${className}"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`
}

function renderHeader(receipt: ReceiptData): string {
  const c = receipt.config
  return [
    c.show_location_name ? `<p class="center bold">${escapeHtml(receipt.location_name)}</p>` : '',
    c.show_location_address ? `<p class="center">${escapeHtml(receipt.location_address)}</p>` : '',
    c.show_location_phone && receipt.location_phone ? `<p class="center">${escapeHtml(receipt.location_phone)}</p>` : '',
    c.show_license_number ? `<p class="center">License: ${escapeHtml(receipt.license_number)}</p>` : '',
    `<p class="center">Receipt #${escapeHtml(receipt.receipt_number)}</p>`,
    `<p class="center">${escapeHtml(new Date(receipt.date).toLocaleString())}</p>`,
    '<div class="divider"></div>',
    c.show_employee_name ? `<p>Cashier: ${escapeHtml(receipt.employee_name)}</p>` : '',
    c.show_customer_name && receipt.customer_name ? `<p>Customer: ${escapeHtml(receipt.customer_name)}</p>` : '',
  ].join('')
}

function renderLines(receipt: ReceiptData): string {
  return receipt.lines.map((line) => [
    row(line.product_name, money(line.line_total)),
    `<p class="detail">${escapeHtml(line.quantity)} x ${escapeHtml(money(line.unit_price))}</p>`,
    receipt.config.show_sku && line.sku ? `<p class="detail">SKU: ${escapeHtml(line.sku)}</p>` : '',
    receipt.config.show_thc_percentage && line.thc_percentage !== null
      ? `<p class="detail">THC: ${escapeHtml(line.thc_percentage)}%</p>` : '',
  ].join('')).join('')
}

function renderTotals(receipt: ReceiptData): string {
  const discountRows = receipt.config.show_discount_details
    ? receipt.discounts.map((discount) => row(discount.name, `-${money(discount.amount)}`)).join('') : ''
  const taxRows = receipt.config.show_tax_breakdown
    ? receipt.taxes.map((tax) => row(`${tax.name} (${(tax.rate * 100).toFixed(2)}%)`, money(tax.amount))).join('') : ''
  const rounding = receipt.rounding_adjustment !== 0
    ? row('Rounding adjustment', money(receipt.rounding_adjustment)) : ''
  return [
    row('Subtotal', money(receipt.subtotal)), discountRows,
    receipt.discount_total > 0 ? row('Discount Total', `-${money(receipt.discount_total)}`) : '',
    taxRows, rounding, '<div class="divider"></div>',
    row('TOTAL', money(receipt.total), 'total-row'),
  ].join('')
}

function renderFooter(receipt: ReceiptData, isReprint: boolean): string {
  const c = receipt.config
  return [
    ...receipt.payments.map((payment) => [
      row(payment.method.replaceAll('_', ' '), money(payment.amount)),
      payment.change > 0 ? row('Change', money(payment.change)) : '',
    ].join('')),
    isReprint ? '<p class="center bold">** REPRINT **</p>' : '',
    c.show_loyalty_points && receipt.loyalty_points_earned !== null
      ? `<p>Points Earned: ${escapeHtml(receipt.loyalty_points_earned)}</p>` : '',
    c.show_return_policy ? '<p>Returns within 14 days with receipt</p>' : '',
    c.show_biotrack_id && receipt.biotrack_transaction_id
      ? `<p>BioTrack: ${escapeHtml(receipt.biotrack_transaction_id)}</p>` : '',
    '<p class="center">Thank you for choosing Oasis!</p>',
  ].join('')
}

export function buildReceiptBodyHtml(receipt: ReceiptData, isReprint = false): string {
  return [
    renderHeader(receipt), '<div class="divider"></div>', renderLines(receipt),
    '<div class="divider"></div>', renderTotals(receipt),
    '<div class="divider"></div>', renderFooter(receipt, isReprint),
  ].join('')
}

export const RECEIPT_PRINT_STYLES = `
  body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; margin: 0; color: #000; background: #fff; }
  p { margin: 2px 0; } .center { text-align: center; } .bold { font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .row, .total-row { display: flex; justify-content: space-between; gap: 8px; }
  .total-row { font-weight: bold; font-size: 14px; } .detail { padding-left: 8px; font-size: 10px; }
`

export function buildReceiptDocumentHtml(receipt: ReceiptData, isReprint = false): string {
  return `<html><head><title>Receipt</title><style>${RECEIPT_PRINT_STYLES}</style></head><body>${buildReceiptBodyHtml(receipt, isReprint)}</body></html>`
}
