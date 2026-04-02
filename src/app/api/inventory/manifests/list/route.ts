import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

interface ManifestRecord {
  manifest_id: string
  status: string
  transfer_type: 'wholesale' | 'retail'
  from_name: string
  to_name: string
  sent_date: string | null
  received_date: string | null
  items_count: number
  qty_sent: number
  qty_received: number
  discrepancies: number
  notes: string | null
  items: ManifestItemRecord[]
}

interface ManifestItemRecord {
  id: string
  barcode: string
  product_name: string
  category: string
  qty_sent: number
  qty_received: number
  cost_per_unit: number | null
  batch_id: string | null
  lot_number: string | null
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const p = request.nextUrl.searchParams
    const locationId = p.get('location_id') ?? session.locationId
    const page = Math.max(1, Number(p.get('page') || 1))
    const perPage = Math.min(100, Math.max(1, Number(p.get('per_page') || 25)))
    const offset = (page - 1) * perPage
    const search = p.get('search')?.trim() || null
    const tab = p.get('tab') || 'wholesale'

    const sb = await createSupabaseServerClient()

    // Strategy: combine two data sources
    // 1. biotrack_sync_log entries with entity_type = 'manifest' (BioTrack manifest records)
    // 2. inventory_items grouped by batch_id (received inventory batches)

    // --- Source 1: BioTrack sync log manifest entries ---
    let syncQuery = sb
      .from('biotrack_sync_log')
      .select('*', { count: 'exact' })
      .eq('organization_id', session.organizationId)
      .eq('entity_type', 'manifest')

    if (locationId) {
      syncQuery = syncQuery.eq('location_id', locationId)
    }

    if (search) {
      syncQuery = syncQuery.or(`entity_id.ilike.%${search}%,biotrack_endpoint.ilike.%${search}%`)
    }

    const { data: syncLogs, error: syncError } = await syncQuery
      .order('created_at', { ascending: false })
      .range(0, 200)

    if (syncError) {
      logger.error('Manifest sync log query error', { error: syncError.message })
    }

    // --- Source 2: Inventory items grouped by batch_id ---
    let invQuery = sb
      .from('inventory_items')
      .select('id, batch_id, lot_number, biotrack_barcode, quantity, cost_per_unit, received_at, received_by, vendor_id, product_id, products ( id, name, sku ), vendors ( id, name )')
      .eq('location_id', locationId)
      .not('batch_id', 'is', null)

    if (search) {
      invQuery = invQuery.or(`batch_id.ilike.%${search}%,biotrack_barcode.ilike.%${search}%,lot_number.ilike.%${search}%`)
    }

    const { data: invItems, error: invError } = await invQuery
      .order('received_at', { ascending: false })
      .range(0, 500)

    if (invError) {
      logger.error('Manifest inventory query error', { error: invError.message })
    }

    // --- Build manifest records from sync log entries ---
    const manifestMap = new Map<string, ManifestRecord>()

    if (syncLogs) {
      for (const log of syncLogs) {
        const manifestId = log.entity_id ?? log.id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reqPayload = log.request_payload as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resPayload = log.response_payload as any

        const isAccept = log.biotrack_endpoint.includes('accept')
        const existingManifest = manifestMap.get(manifestId)

        if (existingManifest) {
          if (isAccept && log.status === 'success') {
            existingManifest.status = 'received'
            existingManifest.received_date = log.completed_at ?? log.created_at
          }
          continue
        }

        const senderName = reqPayload?.manifest?.sender_name
          ?? resPayload?.sender_name
          ?? reqPayload?.from_name
          ?? 'Unknown Sender'

        const manifestItems = reqPayload?.manifest?.items ?? resPayload?.items ?? []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalSent = manifestItems.reduce((sum: number, item: any) => sum + (item.quantity ?? item.weight ?? 0), 0)

        const record: ManifestRecord = {
          manifest_id: manifestId,
          status: isAccept && log.status === 'success' ? 'received' : log.status === 'success' ? 'pending' : log.status === 'error' ? 'error' : 'pending',
          transfer_type: 'wholesale',
          from_name: senderName,
          to_name: log.location_id ? 'This Location' : 'Unknown',
          sent_date: reqPayload?.manifest?.transfer_date ?? log.created_at,
          received_date: isAccept ? (log.completed_at ?? log.created_at) : null,
          items_count: manifestItems.length,
          qty_sent: totalSent,
          qty_received: isAccept ? totalSent : 0,
          discrepancies: 0,
          notes: log.error_message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          items: manifestItems.map((item: any, idx: number) => ({
            id: `${manifestId}-${idx}`,
            barcode: item.barcode ?? '',
            product_name: item.product_name ?? item.strain ?? '',
            category: item.category ?? '',
            qty_sent: item.quantity ?? item.weight ?? 0,
            qty_received: isAccept ? (item.accepted_quantity ?? item.quantity ?? 0) : 0,
            cost_per_unit: null,
            batch_id: item.batch_number ?? null,
            lot_number: null,
          })),
        }

        manifestMap.set(manifestId, record)
      }
    }

    // --- Build manifest records from inventory batch groups ---
    if (invItems) {
      const batchGroups = new Map<string, typeof invItems>()
      for (const item of invItems) {
        const batchKey = item.batch_id ?? item.id
        const group = batchGroups.get(batchKey) ?? []
        group.push(item)
        batchGroups.set(batchKey, group)
      }

      for (const [batchId, batchItems] of batchGroups) {
        if (manifestMap.has(batchId)) {
          const existing = manifestMap.get(batchId)!
          existing.qty_received = batchItems.reduce((sum, item) => sum + item.quantity, 0)
          existing.discrepancies = Math.abs(existing.qty_sent - existing.qty_received)
          existing.items = batchItems.map((item) => ({
            id: item.id,
            barcode: item.biotrack_barcode ?? '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            product_name: (item.products as any)?.name ?? '',
            category: '',
            qty_sent: item.quantity,
            qty_received: item.quantity,
            cost_per_unit: item.cost_per_unit,
            batch_id: item.batch_id,
            lot_number: item.lot_number,
          }))
          continue
        }

        const firstItem = batchItems[0]
        if (!firstItem) continue
        const totalQty = batchItems.reduce((sum, item) => sum + item.quantity, 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vendorName = (firstItem.vendors as any)?.name ?? null

        const record: ManifestRecord = {
          manifest_id: batchId,
          status: 'received',
          transfer_type: vendorName ? 'wholesale' : 'retail',
          from_name: vendorName ?? 'Manual Entry',
          to_name: 'This Location',
          sent_date: firstItem.received_at,
          received_date: firstItem.received_at,
          items_count: batchItems.length,
          qty_sent: totalQty,
          qty_received: totalQty,
          discrepancies: 0,
          notes: null,
          items: batchItems.map((item) => ({
            id: item.id,
            barcode: item.biotrack_barcode ?? '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            product_name: (item.products as any)?.name ?? '',
            category: '',
            qty_sent: item.quantity,
            qty_received: item.quantity,
            cost_per_unit: item.cost_per_unit,
            batch_id: item.batch_id,
            lot_number: item.lot_number,
          })),
        }

        manifestMap.set(batchId, record)
      }
    }

    // --- Filter by tab ---
    let manifests = Array.from(manifestMap.values())
    if (tab === 'wholesale') {
      manifests = manifests.filter((m) => m.transfer_type === 'wholesale')
    } else if (tab === 'retail') {
      manifests = manifests.filter((m) => m.transfer_type === 'retail')
    }

    // --- Sort by sent_date descending ---
    manifests.sort((a, b) => {
      const dateA = a.sent_date ? new Date(a.sent_date).getTime() : 0
      const dateB = b.sent_date ? new Date(b.sent_date).getTime() : 0
      return dateB - dateA
    })

    // --- Paginate ---
    const total = manifests.length
    const paged = manifests.slice(offset, offset + perPage)

    return NextResponse.json({
      manifests: paged,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Manifest list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
