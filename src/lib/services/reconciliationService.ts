import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface ReconciliationItem {
  biotrack_barcode: string
  product_name: string
  local_quantity: number
  biotrack_quantity: number
  variance: number
  status: 'matched' | 'discrepancy' | 'local_only' | 'biotrack_only'
  auto_resolved: boolean
  resolution_notes: string | null
}

export interface ReconciliationReport {
  id?: string
  location_id: string
  location_name: string
  run_at: string
  items_matched: number
  items_with_discrepancy: number
  items_local_only: number
  items_biotrack_only: number
  auto_resolved: number
  needs_review: number
  items: ReconciliationItem[]
}

const VARIANCE_THRESHOLD = 0.1

export async function runDailyReconciliation(locationId: string, employeeId: string): Promise<ReconciliationReport> {
  const sb = await createSupabaseServerClient()

  const { data: location } = await sb.from('locations').select('name, organization_id, biotrack_location_id').eq('id', locationId).single()
  if (!location) throw new Error('Location not found')

  // Pull BioTrack inventory
  let btItems: Array<{ barcode: string; product_name: string; quantity: number }> = []
  try {
    const { getBioTrackClient } = await import('@/lib/biotrack/client')
    const client = getBioTrackClient()
    const response = await client.call('inventory/sync', { location_id: location.biotrack_location_id ?? locationId }, {
      organizationId: location.organization_id, locationId, entityType: 'reconciliation',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    btItems = ((response.data as any)?.inventory ?? []).map((i: any) => ({
      barcode: i.barcode ?? i.id ?? '', product_name: i.product_name ?? i.productname ?? '', quantity: i.quantity ?? i.remaining_quantity ?? 0,
    }))
  } catch (err) {
    logger.warn('BioTrack sync failed during reconciliation, using empty', { error: String(err) })
  }

  // Load local inventory
  const { data: localItems } = await sb.from('inventory_items').select('biotrack_barcode, quantity, products ( name )').eq('location_id', locationId).eq('is_active', true)

  const btMap = new Map(btItems.map((i) => [i.barcode, i]))
  const localMap = new Map<string, { barcode: string; quantity: number; name: string }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of localItems ?? []) {
    if (!item.biotrack_barcode) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localMap.set(item.biotrack_barcode, { barcode: item.biotrack_barcode, quantity: item.quantity, name: (item.products as any)?.name ?? '' })
  }

  const items: ReconciliationItem[] = []
  let matched = 0, discrepancies = 0, localOnly = 0, btOnly = 0, autoResolved = 0

  // Compare matched barcodes
  for (const [barcode, local] of localMap) {
    const bt = btMap.get(barcode)
    if (bt) {
      const variance = local.quantity - bt.quantity
      if (Math.abs(variance) < VARIANCE_THRESHOLD) {
        items.push({ biotrack_barcode: barcode, product_name: local.name, local_quantity: local.quantity, biotrack_quantity: bt.quantity, variance, status: 'matched', auto_resolved: Math.abs(variance) > 0, resolution_notes: null })
        matched++
        if (Math.abs(variance) > 0) autoResolved++
      } else {
        items.push({ biotrack_barcode: barcode, product_name: local.name, local_quantity: local.quantity, biotrack_quantity: bt.quantity, variance, status: 'discrepancy', auto_resolved: false, resolution_notes: null })
        discrepancies++
      }
      btMap.delete(barcode)
    } else {
      items.push({ biotrack_barcode: barcode, product_name: local.name, local_quantity: local.quantity, biotrack_quantity: 0, variance: local.quantity, status: 'local_only', auto_resolved: false, resolution_notes: null })
      localOnly++
    }
  }

  // BioTrack-only items
  for (const [barcode, bt] of btMap) {
    items.push({ biotrack_barcode: barcode, product_name: bt.product_name, local_quantity: 0, biotrack_quantity: bt.quantity, variance: -bt.quantity, status: 'biotrack_only', auto_resolved: false, resolution_notes: null })
    btOnly++
  }

  const report: ReconciliationReport = {
    location_id: locationId, location_name: location.name, run_at: new Date().toISOString(),
    items_matched: matched, items_with_discrepancy: discrepancies, items_local_only: localOnly,
    items_biotrack_only: btOnly, auto_resolved: autoResolved, needs_review: discrepancies + localOnly + btOnly, items,
  }

  // Save report
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: saved } = await ((sb as any).from('reconciliation_reports') as any).insert({
    organization_id: location.organization_id, location_id: locationId, run_by: employeeId,
    items_matched: matched, items_with_discrepancy: discrepancies, items_local_only: localOnly,
    items_biotrack_only: btOnly, auto_resolved: autoResolved, needs_review: report.needs_review,
    details: items, status: 'completed',
  }).select('id').single()

  if (saved) report.id = saved.id

  // Audit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await sb.from('audit_log').insert({ organization_id: location.organization_id, location_id: locationId, employee_id: employeeId, entity_type: 'reconciliation', event_type: 'run', entity_id: saved?.id ?? '', metadata: { matched, discrepancies, localOnly, btOnly } } as any)

  logger.info('Reconciliation complete', { locationId, matched, discrepancies, localOnly, btOnly })
  return report
}

export async function listReports(locationId?: string, page = 1) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = ((sb as any).from('reconciliation_reports') as any).select('id, location_id, run_at, items_matched, items_with_discrepancy, items_local_only, items_biotrack_only, auto_resolved, needs_review, status', { count: 'exact' })
  if (locationId) query = query.eq('location_id', locationId)
  const { data, count } = await query.order('run_at', { ascending: false }).range((page - 1) * 20, page * 20 - 1)
  return { reports: data ?? [], total: count ?? 0 }
}

export async function getReport(id: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await ((sb as any).from('reconciliation_reports') as any).select('*').eq('id', id).single()
  return data
}
