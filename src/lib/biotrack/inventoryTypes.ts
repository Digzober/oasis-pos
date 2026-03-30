export interface BioTrackManifestItem {
  barcode: string
  product_name: string
  quantity: number
  weight: number
  category: string
  batch_number: string
  lab_results: Record<string, unknown> | null
  thc_percentage: number | null
  cbd_percentage: number | null
}

export interface BioTrackManifest {
  manifest_id: string
  sender_license: string
  sender_name: string
  transfer_date: string
  items: BioTrackManifestItem[]
  status: 'pending' | 'in_transit' | 'delivered'
}

export interface AcceptedManifestItem {
  barcode: string
  accepted_quantity: number
  actual_quantity: number
  product_id: string
  room_id: string
  subroom_id: string | null
  cost_per_unit: number | null
  discrepancy_reason: string | null
}

export interface ReceiveManifestInput {
  organization_id: string
  location_id: string
  employee_id: string
  manifest: BioTrackManifest
  accepted_items: AcceptedManifestItem[]
  vendor_id: string | null
}

export interface ManualReceiveInput {
  organization_id: string
  location_id: string
  employee_id: string
  product_id: string
  room_id: string
  subroom_id: string | null
  quantity: number
  cost_per_unit: number | null
  barcode: string | null
  batch_id: string | null
  lot_number: string | null
  expiration_date: string | null
  vendor_id: string | null
  notes: string | null
}

export interface ReceiveResult {
  items_received: number
  discrepancies: number
  inventory_ids: string[]
}
