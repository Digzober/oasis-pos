export interface BioTrackConfig {
  v1Url: string
  v3Url: string
  username: string
  password: string
  licenseNumber: string
}

export interface BioTrackResponse {
  success: boolean
  data: unknown
  error: string | null
}

export interface SaleDispensePayload {
  license_number: string
  sale_date: string
  patient_type: 'recreational' | 'medical'
  patient_id: string | null
  items: Array<{
    barcode: string
    quantity: number
    unit_price: number
    discount: number
    total: number
  }>
  total_amount: number
  tax_amount: number
  transaction_id: string
}

export interface SaleVoidPayload {
  license_number: string
  original_sale_id: string
  void_reason: string
}

export interface SaleRefundPayload {
  license_number: string
  original_sale_id: string
  refund_items: Array<{
    barcode: string
    quantity: number
    refund_amount: number
  }>
  refund_reason: string
}

export class BioTrackError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public biotrackError: string | null = null,
  ) {
    super(message)
    this.name = 'BioTrackError'
  }
}
