import type { ReceiptData } from '@/lib/receipts/render'

export const RECEIPT_SETTINGS = [
  { key: 'show_location_name', label: 'Show location name', section: 'Header', storage: 'header_config' },
  { key: 'show_location_address', label: 'Show location address', section: 'Header', storage: 'header_config' },
  { key: 'show_location_phone', label: 'Show phone number', section: 'Header', storage: 'header_config' },
  { key: 'show_license_number', label: 'Show license number', section: 'Header', storage: 'header_config' },
  { key: 'show_employee_name', label: 'Show employee name', section: 'Body', storage: 'header_config' },
  { key: 'show_customer_name', label: 'Show customer name', section: 'Body', storage: 'header_config' },
  { key: 'show_sku', label: 'Show SKU per item', section: 'Body', storage: 'line_item_config' },
  { key: 'show_thc_percentage', label: 'Show THC% per item', section: 'Body', storage: 'line_item_config' },
  { key: 'show_tax_breakdown', label: 'Show tax breakdown', section: 'Body', storage: 'line_item_config' },
  { key: 'show_discount_details', label: 'Show discount names', section: 'Body', storage: 'line_item_config' },
  { key: 'show_loyalty_points', label: 'Show loyalty points earned', section: 'Footer', storage: 'footer_config' },
  { key: 'show_return_policy', label: 'Show return policy', section: 'Footer', storage: 'footer_config' },
  { key: 'show_biotrack_id', label: 'Show BioTrack transaction ID', section: 'Footer', storage: 'additional_config' },
] as const

export type ReceiptSetting = (typeof RECEIPT_SETTINGS)[number]
export type ReceiptSettingKey = ReceiptSetting['key']
export type ReceiptSettingStorage = ReceiptSetting['storage']

export const DEFAULT_DISPLAY_CONFIG = Object.fromEntries(
  RECEIPT_SETTINGS.map(({ key }) => [key, true]),
) as Record<ReceiptSettingKey, boolean>

export const PREVIEW_RECEIPT: Omit<ReceiptData, 'config'> = {
  transaction_id: 'preview', receipt_number: '001234', date: '2026-07-14T12:00:00Z',
  location_name: 'Oasis Cannabis Co - Coors',
  location_address: '5201 Coors Blvd NW, Albuquerque, NM 87120',
  location_phone: '505-555-0100', license_number: 'NMCCD-1004',
  employee_name: 'Kane O.', customer_name: 'Walk-in',
  lines: [{
    product_name: 'Blue Dream 3.5g', quantity: 1, unit_price: 30,
    line_total: 35.98, discount_amount: 0, sku: 'PRD-00001',
    thc_percentage: 22.5, biotrack_barcode: '1A4FF0100000022000001234',
  }],
  discounts: [],
  taxes: [{ name: 'Excise Tax', rate: 0.12, amount: 3.60 }, { name: 'GRT', rate: 0.079375, amount: 2.38 }],
  payments: [{ method: 'cash', amount: 35.98, change: 0.02 }],
  subtotal: 30, discount_total: 0, tax_total: 5.98,
  rounding_adjustment: 0, total: 35.98, loyalty_points_earned: 35,
  biotrack_transaction_id: 'TX-001234',
}
