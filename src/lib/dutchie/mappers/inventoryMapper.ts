import type { DutchieInventoryItem } from '../types'

type TestingStatus = 'untested' | 'pending' | 'passed' | 'failed'

const TESTING_STATUS_MAP: Record<string, TestingStatus> = {
  untested: 'untested',
  pending: 'pending',
  'in progress': 'pending',
  in_progress: 'pending',
  passed: 'passed',
  pass: 'passed',
  approved: 'passed',
  failed: 'failed',
  fail: 'failed',
  rejected: 'failed',
}

export interface MappedInventoryItem {
  product_id: string | null
  location_id: string
  room_id: string | null
  quantity: number
  allocated_quantity: number
  unit_cost: number | null
  barcode: string | null
  batch_number: string | null
  lot_number: string | null
  testing_status: TestingStatus
  thc_content: string | null
  cbd_content: string | null
  product_grams: number | null
  flower_equivalent: number | null
  lab_results: Record<string, unknown> | null
  expiration_date: string | null
  received_date: string | null
  external_package_id: string | null
}

export function mapInventoryItem(
  source: DutchieInventoryItem,
  locationId: string,
): MappedInventoryItem {
  const normalizedStatus = source.testingStatus?.toLowerCase().trim() ?? ''
  const testingStatus: TestingStatus = TESTING_STATUS_MAP[normalizedStatus] ?? 'untested'

  return {
    product_id: null,
    location_id: locationId,
    room_id: null,
    quantity: source.quantityAvailable ?? 0,
    allocated_quantity: source.allocatedQuantity ?? 0,
    unit_cost: source.unitCost ?? null,
    barcode: source.barcode ?? null,
    batch_number: source.batchNumber ?? null,
    lot_number: source.lotNumber ?? null,
    testing_status: testingStatus,
    thc_content: source.thcContent ?? null,
    cbd_content: source.cbdContent ?? null,
    product_grams: source.productGrams ?? null,
    flower_equivalent: source.flowerEquivalent ?? null,
    lab_results: source.labResults ?? null,
    expiration_date: source.expirationDate ?? null,
    received_date: source.receivedDate ?? null,
    external_package_id: source.packageId ?? null,
  }
}
