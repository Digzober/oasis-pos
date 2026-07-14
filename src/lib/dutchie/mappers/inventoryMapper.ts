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
  cost_per_unit: number | null
  biotrack_barcode: string | null
  batch_id: string | null
  lot_number: string | null
  testing_status: TestingStatus
  thc_percentage: number | null
  cbd_percentage: number | null
  weight: number | null
  flower_equivalent_grams: number | null
  lab_test_results: Record<string, unknown> | null
  expiration_date: string | null
  received_at: string | null
  external_package_id: string | null
}

/**
 * Extract THC/CBD values from the labResults array.
 * Dutchie /reporting/inventory returns lab results as:
 * [{ labTest: "THC", value: 93.1, labResultUnit: "Milligrams" }, ...]
 */
function extractLabValue(
  labResults: unknown,
  testName: string,
): number | null {
  if (!Array.isArray(labResults)) return null
  for (const lr of labResults) {
    if (typeof lr !== 'object' || lr === null) continue
    const r = lr as Record<string, unknown>
    if (typeof r.labTest === 'string' && r.labTest.toLowerCase() === testName.toLowerCase()) {
      const val = Number(r.value)
      return isNaN(val) ? null : val
    }
  }
  return null
}

/**
 * Convert mg lab values to percentage based on unit weight.
 * If unitWeight is available, percentage = (mg / (unitWeight * 1000)) * 100
 */
function mgToPercentage(mg: number | null, unitWeightGrams: number | null): number | null {
  if (mg === null || !unitWeightGrams || unitWeightGrams <= 0) return null
  return Math.round((mg / (unitWeightGrams * 1000)) * 100 * 100) / 100
}

export function mapInventoryItem(
  source: DutchieInventoryItem,
  locationId: string,
): MappedInventoryItem {
  // THC/CBD from labResults array (reporting endpoint)
  const labResults = (source as Record<string, unknown>).labResults
  const thcMg = extractLabValue(labResults, 'THC')
  const cbdMg = extractLabValue(labResults, 'CBD')

  // Testing status: use labTestStatus field, fall back to testingStatus,
  // then infer from lab results — if THC/CBD values exist, the item was tested
  const rawStatus = (source as Record<string, unknown>).labTestStatus as string | null
    ?? source.testingStatus
  let testingStatus: TestingStatus
  if (rawStatus) {
    const normalizedStatus = rawStatus.toLowerCase().trim()
    testingStatus = TESTING_STATUS_MAP[normalizedStatus] ?? 'untested'
  } else if (thcMg !== null || cbdMg !== null) {
    testingStatus = 'passed'
  } else {
    testingStatus = 'untested'
  }
  const unitWeight = (source as Record<string, unknown>).unitWeight as number | null ?? source.productGrams

  // Barcode: reporting endpoint uses batchName or packageId
  const barcode = source.barcode
    ?? (source as Record<string, unknown>).batchName as string | null
    ?? null

  // Batch ID: reporting endpoint uses batchId (number) or batchName (string)
  const batchId = source.batchNumber
    ?? ((source as Record<string, unknown>).batchId ? String((source as Record<string, unknown>).batchId) : null)

  // Room: reporting endpoint puts room info in roomQuantities
  // Room name resolved in syncEngine via roomMap

  // Received date: reporting endpoint uses packagedDate or manufacturingDate
  const receivedDate = source.receivedDate
    ?? (source as Record<string, unknown>).packagedDate as string | null
    ?? (source as Record<string, unknown>).manufacturingDate as string | null

  return {
    product_id: null,
    location_id: locationId,
    room_id: null,
    quantity: source.quantityAvailable ?? 0,
    cost_per_unit: source.unitCost ?? null,
    biotrack_barcode: barcode,
    batch_id: batchId,
    lot_number: source.lotNumber ?? null,
    testing_status: testingStatus,
    thc_percentage: mgToPercentage(thcMg, unitWeight),
    cbd_percentage: mgToPercentage(cbdMg, unitWeight),
    weight: unitWeight ?? null,
    flower_equivalent_grams: source.flowerEquivalent ?? null,
    lab_test_results: Array.isArray(labResults) ? { results: labResults } : null,
    expiration_date: source.expirationDate ?? null,
    received_at: receivedDate ?? null,
    external_package_id: source.packageId ?? null,
  }
}
