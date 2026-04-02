import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { roundMoney, formatCurrency } from '@/lib/utils/money'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ManifestType = 'transfer' | 'order'
export type ManifestDirection = 'outbound' | 'inbound'
export type ManifestTab = 'wholesale' | 'retail'
export type ManifestStatus =
  | 'draft'
  | 'open'
  | 'in_transit'
  | 'delivered'
  | 'sold'
  | 'cancelled'

export interface ManifestNotes {
  invoice_comments?: string
  transaction_notes?: string
  customer_notes?: string
}

export interface CreateManifestInput {
  organization_id: string
  title: string
  type: ManifestType
  tab?: ManifestTab
  destination_location_id?: string
  vendor_id?: string
  source_location_id: string
  created_by: string
  date?: string
}

export interface ManifestListFilters {
  tab?: ManifestTab
  status?: ManifestStatus
  search?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

export interface ManifestListResult {
  manifests: ManifestRow[]
  total: number
  page: number
  per_page: number
}

export interface ManifestRow {
  id: string
  title: string
  manifest_number: number
  customer_name: string | null
  type: ManifestType
  tab: ManifestTab
  direction: ManifestDirection
  status: ManifestStatus
  created_date: string
  completed_date: string | null
  subtotal: number
  taxes: number
  discounts: number
  credits: number
  total: number
  item_count?: number
}

export interface ManifestDetail {
  id: string
  organization_id: string
  title: string
  manifest_number: number
  biotrack_manifest_id: string | null
  source_location_id: string | null
  destination_location_id: string | null
  vendor_id: string | null
  customer_name: string | null
  type: ManifestType
  direction: ManifestDirection
  tab: ManifestTab
  status: ManifestStatus
  created_date: string
  completed_date: string | null
  last_modified_date: string
  subtotal: number
  taxes: number
  discounts: number
  credits: number
  total: number
  pickup: boolean
  stop_number_on_route: number | null
  total_stops_on_route: number | null
  license_number: string | null
  point_of_contact: string | null
  driver_name: string | null
  driver_id: string | null
  notes: ManifestNotes
  created_by: string | null
  items: ManifestItemRow[]
}

export interface ManifestItemRow {
  id: string
  manifest_id: string
  product_id: string | null
  inventory_item_id: string | null
  sku: string | null
  description: string
  package_id: string | null
  batch: string | null
  brand: string | null
  quantity: number
  accepted_quantity: number | null
  unit_price: number
  subtotal: number
  discount: number
  total_price: number
  discrepancy_reason: string | null
  sort_order: number
}

export interface AddManifestItemInput {
  product_id?: string
  inventory_item_id?: string
  quantity: number
  unit_price?: number
  discount?: number
}

export interface UpdateManifestItemInput {
  quantity?: number
  unit_price?: number
  discount?: number
  accepted_quantity?: number
  discrepancy_reason?: string
}

export interface UpdateManifestInput {
  title?: string
  notes?: ManifestNotes
  driver_name?: string
  driver_id?: string | null
  license_number?: string
  point_of_contact?: string
  pickup?: boolean
  stop_number_on_route?: number | null
  total_stops_on_route?: number | null
  tab?: ManifestTab
  taxes?: number
  credits?: number
}

export interface ReceiveItemOverride {
  item_id: string
  accepted_quantity: number
  discrepancy_reason?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALLOWED_SORT_COLUMNS = new Set([
  'created_date',
  'completed_date',
  'title',
  'customer_name',
  'manifest_number',
  'status',
  'subtotal',
  'total',
  'type',
])

function safeSortColumn(col: string | undefined): string {
  if (col && ALLOWED_SORT_COLUMNS.has(col)) return col
  return 'created_date'
}

// ---------------------------------------------------------------------------
// 1. createManifest
// ---------------------------------------------------------------------------

export async function createManifest(
  input: CreateManifestInput,
): Promise<ManifestDetail> {
  const sb = await createSupabaseServerClient()

  // For transfers, resolve customer_name from destination location
  let customerName: string | null = null

  if (input.type === 'transfer' && input.destination_location_id) {
    if (input.source_location_id === input.destination_location_id) {
      throw new AppError(
        'SAME_LOCATION',
        'Cannot create a manifest to the same location',
        undefined,
        400,
      )
    }

    const { data: destLoc, error: locErr } = await sb
      .from('locations')
      .select('id, name, organization_id')
      .eq('id', input.destination_location_id)
      .single()

    if (locErr || !destLoc) {
      throw new AppError(
        'INVALID_DESTINATION',
        'Destination location not found',
        locErr,
        400,
      )
    }

    // Validate same org
    const { data: srcLoc } = await sb
      .from('locations')
      .select('organization_id')
      .eq('id', input.source_location_id)
      .single()

    if (srcLoc && srcLoc.organization_id !== destLoc.organization_id) {
      throw new AppError(
        'DIFFERENT_ORG',
        'Cannot create manifest between different organizations',
        undefined,
        400,
      )
    }

    customerName = destLoc.name
  }

  if (input.type === 'order' && input.vendor_id) {
    const { data: vendor } = await sb
      .from('vendors')
      .select('id, name')
      .eq('id', input.vendor_id)
      .single()

    if (vendor) {
      customerName = vendor.name
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: manifest, error } = await (sb.from('manifests') as any)
    .insert({
      organization_id: input.organization_id,
      title: input.title,
      type: input.type,
      tab: input.tab ?? 'wholesale',
      direction: 'outbound' as ManifestDirection,
      status: 'draft' as ManifestStatus,
      source_location_id: input.source_location_id,
      destination_location_id: input.destination_location_id ?? null,
      vendor_id: input.vendor_id ?? null,
      customer_name: customerName,
      created_by: input.created_by,
      created_date: input.date ?? new Date().toISOString(),
      notes: {},
    })
    .select('*')
    .single()

  if (error || !manifest) {
    throw new AppError(
      'CREATE_FAILED',
      'Failed to create manifest',
      error,
      500,
    )
  }

  logger.info('Manifest created', {
    manifestId: manifest.id,
    type: input.type,
    title: input.title,
  })

  return mapManifestDetail(manifest, [])
}

// ---------------------------------------------------------------------------
// 2. listManifests
// ---------------------------------------------------------------------------

export async function listManifests(
  orgId: string,
  filters: ManifestListFilters = {},
): Promise<ManifestListResult> {
  const sb = await createSupabaseServerClient()

  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(250, Math.max(1, filters.per_page ?? 100))
  const sortBy = safeSortColumn(filters.sort_by)
  const ascending = (filters.sort_dir ?? 'desc') === 'asc'
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('manifests') as any)
    .select('*, manifest_items(id)', { count: 'exact' })
    .eq('organization_id', orgId)
    .eq('is_active', true)

  if (filters.tab) {
    query = query.eq('tab', filters.tab)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.search) {
    const term = `%${filters.search}%`
    query = query.or(
      `title.ilike.${term},customer_name.ilike.${term},manifest_number::text.ilike.${term}`,
    )
  }

  query = query
    .order(sortBy, { ascending })
    .range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new AppError('LIST_FAILED', 'Failed to list manifests', error, 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const manifests: ManifestRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    manifest_number: row.manifest_number,
    customer_name: row.customer_name,
    type: row.type,
    tab: row.tab,
    direction: row.direction,
    status: row.status,
    created_date: row.created_date,
    completed_date: row.completed_date,
    subtotal: Number(row.subtotal),
    taxes: Number(row.taxes),
    discounts: Number(row.discounts),
    credits: Number(row.credits),
    total: Number(row.total),
    item_count: Array.isArray(row.manifest_items)
      ? row.manifest_items.length
      : 0,
  }))

  return {
    manifests,
    total: count ?? 0,
    page,
    per_page: perPage,
  }
}

// ---------------------------------------------------------------------------
// 3. getManifestDetail
// ---------------------------------------------------------------------------

export async function getManifestDetail(
  manifestId: string,
): Promise<ManifestDetail> {
  const sb = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: manifest, error } = await (sb.from('manifests') as any)
    .select('*')
    .eq('id', manifestId)
    .eq('is_active', true)
    .single()

  if (error || !manifest) {
    throw new AppError(
      'NOT_FOUND',
      'Manifest not found',
      error,
      404,
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items } = await (sb.from('manifest_items') as any)
    .select('*')
    .eq('manifest_id', manifestId)
    .order('sort_order', { ascending: true })

  return mapManifestDetail(manifest, items ?? [])
}

// ---------------------------------------------------------------------------
// 4. updateManifest
// ---------------------------------------------------------------------------

export async function updateManifest(
  manifestId: string,
  data: UpdateManifestInput,
): Promise<ManifestDetail> {
  const sb = await createSupabaseServerClient()

  // Verify manifest exists and is editable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchErr } = await (sb.from('manifests') as any)
    .select('id, status')
    .eq('id', manifestId)
    .eq('is_active', true)
    .single()

  if (fetchErr || !existing) {
    throw new AppError('NOT_FOUND', 'Manifest not found', fetchErr, 404)
  }

  // Build the update payload — only include provided fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}

  if (data.title !== undefined) updates.title = data.title
  if (data.notes !== undefined) updates.notes = data.notes
  if (data.driver_name !== undefined) updates.driver_name = data.driver_name
  if (data.driver_id !== undefined) updates.driver_id = data.driver_id
  if (data.license_number !== undefined) updates.license_number = data.license_number
  if (data.point_of_contact !== undefined) updates.point_of_contact = data.point_of_contact
  if (data.pickup !== undefined) updates.pickup = data.pickup
  if (data.stop_number_on_route !== undefined) updates.stop_number_on_route = data.stop_number_on_route
  if (data.total_stops_on_route !== undefined) updates.total_stops_on_route = data.total_stops_on_route
  if (data.tab !== undefined) updates.tab = data.tab
  if (data.taxes !== undefined) updates.taxes = data.taxes
  if (data.credits !== undefined) updates.credits = data.credits

  if (Object.keys(updates).length === 0) {
    return getManifestDetail(manifestId)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (sb.from('manifests') as any)
    .update(updates)
    .eq('id', manifestId)

  if (updateErr) {
    throw new AppError('UPDATE_FAILED', 'Failed to update manifest', updateErr, 500)
  }

  logger.info('Manifest updated', { manifestId, fields: Object.keys(updates) })

  return getManifestDetail(manifestId)
}

// ---------------------------------------------------------------------------
// 5. addManifestItem
// ---------------------------------------------------------------------------

export async function addManifestItem(
  manifestId: string,
  input: AddManifestItemInput,
): Promise<ManifestItemRow> {
  const sb = await createSupabaseServerClient()

  // Verify manifest exists and is in a writable status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: manifest, error: mErr } = await (sb.from('manifests') as any)
    .select('id, status, source_location_id, organization_id')
    .eq('id', manifestId)
    .eq('is_active', true)
    .single()

  if (mErr || !manifest) {
    throw new AppError('NOT_FOUND', 'Manifest not found', mErr, 404)
  }

  if (manifest.status !== 'draft' && manifest.status !== 'open') {
    throw new AppError(
      'NOT_EDITABLE',
      `Cannot add items to a manifest in "${manifest.status}" status`,
      undefined,
      400,
    )
  }

  // Snapshot product data
  let sku: string | null = null
  let description = ''
  let brand: string | null = null
  let packageId: string | null = null
  let batch: string | null = null
  let unitPrice = input.unit_price ?? 0

  if (input.inventory_item_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invItem, error: invErr } = await (sb.from('inventory_items') as any)
      .select('id, product_id, biotrack_barcode, batch_id, quantity, quantity_reserved, cost_per_unit, products ( id, name, sku, brands ( name ) )')
      .eq('id', input.inventory_item_id)
      .eq('location_id', manifest.source_location_id)
      .single()

    if (invErr || !invItem) {
      throw new AppError(
        'ITEM_NOT_FOUND',
        'Inventory item not found at source location',
        invErr,
        400,
      )
    }

    const available = Number(invItem.quantity) - Number(invItem.quantity_reserved ?? 0)
    if (input.quantity > available) {
      throw new AppError(
        'INSUFFICIENT_QUANTITY',
        `Insufficient quantity. Available: ${available}, requested: ${input.quantity}`,
        undefined,
        400,
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = invItem.products as any
    sku = product?.sku ?? null
    description = product?.name ?? ''
    brand = product?.brands?.name ?? null
    packageId = invItem.biotrack_barcode ?? null
    batch = invItem.batch_id ?? null
    if (input.unit_price === undefined && invItem.cost_per_unit) {
      unitPrice = Number(invItem.cost_per_unit)
    }
    if (!input.product_id && product?.id) {
      input.product_id = product.id
    }
  } else if (input.product_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: product, error: pErr } = await (sb.from('products') as any)
      .select('id, name, sku, rec_price, brands ( name )')
      .eq('id', input.product_id)
      .single()

    if (pErr || !product) {
      throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', pErr, 400)
    }

    sku = product.sku ?? null
    description = product.name ?? ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    brand = (product.brands as any)?.name ?? null
    if (input.unit_price === undefined && product.rec_price) {
      unitPrice = Number(product.rec_price)
    }
  }

  if (!description) {
    throw new AppError(
      'MISSING_DESCRIPTION',
      'Item must have a product or inventory item reference to derive a description',
      undefined,
      400,
    )
  }

  const discountAmt = input.discount ?? 0
  const itemSubtotal = roundMoney(input.quantity * unitPrice)
  const totalPrice = roundMoney(itemSubtotal - discountAmt)

  // Get next sort order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: itemCount } = await (sb.from('manifest_items') as any)
    .select('id', { count: 'exact', head: true })
    .eq('manifest_id', manifestId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newItem, error: insertErr } = await (sb.from('manifest_items') as any)
    .insert({
      manifest_id: manifestId,
      product_id: input.product_id ?? null,
      inventory_item_id: input.inventory_item_id ?? null,
      sku,
      description,
      package_id: packageId,
      batch,
      brand,
      quantity: input.quantity,
      unit_price: unitPrice,
      subtotal: itemSubtotal,
      discount: discountAmt,
      total_price: totalPrice,
      sort_order: (itemCount ?? 0) + 1,
    })
    .select('*')
    .single()

  if (insertErr || !newItem) {
    throw new AppError('ADD_ITEM_FAILED', 'Failed to add item to manifest', insertErr, 500)
  }

  // Recalculate manifest totals
  await recalculateManifestTotals(manifestId)

  logger.info('Manifest item added', {
    manifestId,
    itemId: newItem.id,
    description,
    quantity: input.quantity,
  })

  return mapManifestItem(newItem)
}

// ---------------------------------------------------------------------------
// 6. updateManifestItem
// ---------------------------------------------------------------------------

export async function updateManifestItem(
  itemId: string,
  data: UpdateManifestItemInput,
): Promise<ManifestItemRow> {
  const sb = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchErr } = await (sb.from('manifest_items') as any)
    .select('*, manifests!inner( id, status )')
    .eq('id', itemId)
    .single()

  if (fetchErr || !existing) {
    throw new AppError('ITEM_NOT_FOUND', 'Manifest item not found', fetchErr, 404)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const manifestStatus = (existing.manifests as any)?.status
  if (manifestStatus !== 'draft' && manifestStatus !== 'open' && manifestStatus !== 'in_transit') {
    throw new AppError(
      'NOT_EDITABLE',
      `Cannot update items on a manifest in "${manifestStatus}" status`,
      undefined,
      400,
    )
  }

  const quantity = data.quantity ?? Number(existing.quantity)
  const unitPrice = data.unit_price ?? Number(existing.unit_price)
  const discount = data.discount ?? Number(existing.discount)
  const itemSubtotal = roundMoney(quantity * unitPrice)
  const totalPrice = roundMoney(itemSubtotal - discount)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    quantity,
    unit_price: unitPrice,
    subtotal: itemSubtotal,
    discount,
    total_price: totalPrice,
  }

  if (data.accepted_quantity !== undefined) {
    updates.accepted_quantity = data.accepted_quantity
  }
  if (data.discrepancy_reason !== undefined) {
    updates.discrepancy_reason = data.discrepancy_reason
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateErr } = await (sb.from('manifest_items') as any)
    .update(updates)
    .eq('id', itemId)
    .select('*')
    .single()

  if (updateErr || !updated) {
    throw new AppError('UPDATE_ITEM_FAILED', 'Failed to update manifest item', updateErr, 500)
  }

  await recalculateManifestTotals(existing.manifest_id)

  logger.info('Manifest item updated', { itemId, updates: Object.keys(data) })

  return mapManifestItem(updated)
}

// ---------------------------------------------------------------------------
// 7. removeManifestItem
// ---------------------------------------------------------------------------

export async function removeManifestItem(itemId: string): Promise<void> {
  const sb = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchErr } = await (sb.from('manifest_items') as any)
    .select('id, manifest_id, manifests!inner( id, status )')
    .eq('id', itemId)
    .single()

  if (fetchErr || !existing) {
    throw new AppError('ITEM_NOT_FOUND', 'Manifest item not found', fetchErr, 404)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const manifestStatus = (existing.manifests as any)?.status
  if (manifestStatus !== 'draft' && manifestStatus !== 'open') {
    throw new AppError(
      'NOT_EDITABLE',
      `Cannot remove items from a manifest in "${manifestStatus}" status`,
      undefined,
      400,
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delErr } = await (sb.from('manifest_items') as any)
    .delete()
    .eq('id', itemId)

  if (delErr) {
    throw new AppError('REMOVE_ITEM_FAILED', 'Failed to remove manifest item', delErr, 500)
  }

  await recalculateManifestTotals(existing.manifest_id)

  logger.info('Manifest item removed', { itemId, manifestId: existing.manifest_id })
}

// ---------------------------------------------------------------------------
// 8. sendManifest
// ---------------------------------------------------------------------------

export async function sendManifest(
  manifestId: string,
  employeeId: string,
): Promise<ManifestDetail> {
  const sb = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: manifest, error: mErr } = await (sb.from('manifests') as any)
    .select('*')
    .eq('id', manifestId)
    .eq('is_active', true)
    .single()

  if (mErr || !manifest) {
    throw new AppError('NOT_FOUND', 'Manifest not found', mErr, 404)
  }

  if (manifest.status !== 'draft' && manifest.status !== 'open') {
    throw new AppError(
      'INVALID_STATUS',
      `Cannot send a manifest in "${manifest.status}" status. Must be draft or open.`,
      undefined,
      400,
    )
  }

  // Get items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items, error: itemsErr } = await (sb.from('manifest_items') as any)
    .select('*')
    .eq('manifest_id', manifestId)

  if (itemsErr) {
    throw new AppError('ITEMS_FETCH_FAILED', 'Failed to fetch manifest items', itemsErr, 500)
  }

  if (!items || items.length === 0) {
    throw new AppError(
      'NO_ITEMS',
      'Cannot send a manifest with no items',
      undefined,
      400,
    )
  }

  // Decrement source inventory for each item with an inventory_item_id
  for (const item of items) {
    if (!item.inventory_item_id) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invItem, error: invErr } = await (sb.from('inventory_items') as any)
      .select('id, quantity, quantity_reserved')
      .eq('id', item.inventory_item_id)
      .single()

    if (invErr || !invItem) {
      throw new AppError(
        'INVENTORY_NOT_FOUND',
        `Inventory item ${item.inventory_item_id} not found`,
        invErr,
        400,
      )
    }

    const available = Number(invItem.quantity) - Number(invItem.quantity_reserved ?? 0)
    if (Number(item.quantity) > available) {
      throw new AppError(
        'INSUFFICIENT_QUANTITY',
        `Insufficient quantity for "${item.description}". Available: ${available}, needed: ${item.quantity}`,
        undefined,
        400,
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: decErr } = await (sb.from('inventory_items') as any)
      .update({
        quantity: Number(invItem.quantity) - Number(item.quantity),
      })
      .eq('id', item.inventory_item_id)

    if (decErr) {
      throw new AppError(
        'DECREMENT_FAILED',
        `Failed to decrement inventory for "${item.description}"`,
        decErr,
        500,
      )
    }
  }

  // Transition manifest to in_transit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: statusErr } = await (sb.from('manifests') as any)
    .update({ status: 'in_transit' })
    .eq('id', manifestId)

  if (statusErr) {
    throw new AppError('STATUS_UPDATE_FAILED', 'Failed to update manifest status', statusErr, 500)
  }

  // Audit log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await sb.from('audit_log').insert({
    organization_id: manifest.organization_id,
    location_id: manifest.source_location_id,
    employee_id: employeeId,
    entity_type: 'manifest',
    event_type: 'send',
    entity_id: manifestId,
    metadata: {
      title: manifest.title,
      destination_location_id: manifest.destination_location_id,
      item_count: items.length,
      total: Number(manifest.total),
    },
  } as any)

  logger.info('Manifest sent', {
    manifestId,
    employeeId,
    itemCount: items.length,
  })

  // Fire-and-forget BioTrack manifest creation
  fireBioTrackManifestCreate(manifest, items).catch((err) => {
    logger.error('BioTrack manifest creation failed (fire-and-forget)', {
      manifestId,
      error: String(err),
    })
  })

  return getManifestDetail(manifestId)
}

// ---------------------------------------------------------------------------
// 9. receiveManifest
// ---------------------------------------------------------------------------

export async function receiveManifest(
  manifestId: string,
  employeeId: string,
  itemOverrides?: ReceiveItemOverride[],
): Promise<ManifestDetail> {
  const sb = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: manifest, error: mErr } = await (sb.from('manifests') as any)
    .select('*')
    .eq('id', manifestId)
    .eq('is_active', true)
    .single()

  if (mErr || !manifest) {
    throw new AppError('NOT_FOUND', 'Manifest not found', mErr, 404)
  }

  if (manifest.status !== 'in_transit') {
    throw new AppError(
      'INVALID_STATUS',
      `Cannot receive a manifest in "${manifest.status}" status. Must be in_transit.`,
      undefined,
      400,
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items, error: itemsErr } = await (sb.from('manifest_items') as any)
    .select('*')
    .eq('manifest_id', manifestId)

  if (itemsErr) {
    throw new AppError('ITEMS_FETCH_FAILED', 'Failed to fetch manifest items', itemsErr, 500)
  }

  // Build override lookup
  const overrideMap = new Map<string, ReceiveItemOverride>()
  if (itemOverrides) {
    for (const ov of itemOverrides) {
      overrideMap.set(ov.item_id, ov)
    }
  }

  // Apply accepted_quantity overrides to items
  for (const item of items ?? []) {
    const override = overrideMap.get(item.id)
    const acceptedQty = override?.accepted_quantity ?? Number(item.quantity)
    const reason = override?.discrepancy_reason ?? null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from('manifest_items') as any)
      .update({
        accepted_quantity: acceptedQty,
        discrepancy_reason: reason,
      })
      .eq('id', item.id)
  }

  // Create inventory at destination for each item with a product_id
  if (manifest.destination_location_id) {
    // Get default room at destination (Sales Floor or first room)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rooms } = await (sb.from('rooms') as any)
      .select('id, name')
      .eq('location_id', manifest.destination_location_id)
      .order('name', { ascending: true })
      .limit(5)

    const defaultRoom = rooms?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r.name === 'Sales Floor',
    ) ?? rooms?.[0]

    for (const item of items ?? []) {
      if (!item.product_id) continue

      const override = overrideMap.get(item.id)
      const receivedQty = override?.accepted_quantity ?? Number(item.quantity)

      if (receivedQty <= 0) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: createErr } = await (sb.from('inventory_items') as any)
        .insert({
          location_id: manifest.destination_location_id,
          product_id: item.product_id,
          room_id: defaultRoom?.id ?? null,
          biotrack_barcode: item.package_id ?? null,
          batch_id: item.batch ?? null,
          quantity: receivedQty,
          cost_per_unit: Number(item.unit_price),
          received_at: new Date().toISOString(),
          received_by: employeeId,
        })

      if (createErr) {
        logger.error('Failed to create inventory item during manifest receive', {
          manifestId,
          productId: item.product_id,
          error: createErr.message,
        })
      }
    }
  }

  // Transition to sold
  const completedDate = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: statusErr } = await (sb.from('manifests') as any)
    .update({
      status: 'sold',
      completed_date: completedDate,
    })
    .eq('id', manifestId)

  if (statusErr) {
    throw new AppError('STATUS_UPDATE_FAILED', 'Failed to update manifest status', statusErr, 500)
  }

  // Recalculate totals based on accepted quantities
  await recalculateManifestTotals(manifestId)

  // Audit log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await sb.from('audit_log').insert({
    organization_id: manifest.organization_id,
    location_id: manifest.destination_location_id ?? manifest.source_location_id,
    employee_id: employeeId,
    entity_type: 'manifest',
    event_type: 'receive',
    entity_id: manifestId,
    metadata: {
      title: manifest.title,
      source_location_id: manifest.source_location_id,
      item_count: items?.length ?? 0,
      overrides: itemOverrides?.length ?? 0,
    },
  } as any)

  logger.info('Manifest received', {
    manifestId,
    employeeId,
    itemCount: items?.length ?? 0,
  })

  // Fire-and-forget BioTrack manifest acceptance
  if (manifest.biotrack_manifest_id) {
    fireBioTrackManifestAccept(manifest, items ?? []).catch((err) => {
      logger.error('BioTrack manifest acceptance failed (fire-and-forget)', {
        manifestId,
        error: String(err),
      })
    })
  }

  return getManifestDetail(manifestId)
}

// ---------------------------------------------------------------------------
// 10. reopenManifest
// ---------------------------------------------------------------------------

export async function reopenManifest(
  manifestId: string,
): Promise<ManifestDetail> {
  const sb = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: manifest, error: mErr } = await (sb.from('manifests') as any)
    .select('id, status')
    .eq('id', manifestId)
    .eq('is_active', true)
    .single()

  if (mErr || !manifest) {
    throw new AppError('NOT_FOUND', 'Manifest not found', mErr, 404)
  }

  if (manifest.status !== 'sold') {
    throw new AppError(
      'INVALID_STATUS',
      `Cannot reopen a manifest in "${manifest.status}" status. Must be sold.`,
      undefined,
      400,
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (sb.from('manifests') as any)
    .update({
      status: 'open',
      completed_date: null,
    })
    .eq('id', manifestId)

  if (updateErr) {
    throw new AppError('REOPEN_FAILED', 'Failed to reopen manifest', updateErr, 500)
  }

  logger.info('Manifest reopened', { manifestId })

  return getManifestDetail(manifestId)
}

// ---------------------------------------------------------------------------
// 11. deleteManifest
// ---------------------------------------------------------------------------

export async function deleteManifest(manifestId: string): Promise<void> {
  const sb = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: manifest, error: mErr } = await (sb.from('manifests') as any)
    .select('id, status')
    .eq('id', manifestId)
    .eq('is_active', true)
    .single()

  if (mErr || !manifest) {
    throw new AppError('NOT_FOUND', 'Manifest not found', mErr, 404)
  }

  if (manifest.status !== 'draft') {
    throw new AppError(
      'NOT_DELETABLE',
      `Only draft manifests can be deleted. Current status: "${manifest.status}"`,
      undefined,
      400,
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delErr } = await (sb.from('manifests') as any)
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
    })
    .eq('id', manifestId)

  if (delErr) {
    throw new AppError('DELETE_FAILED', 'Failed to delete manifest', delErr, 500)
  }

  logger.info('Manifest soft-deleted', { manifestId })
}

// ---------------------------------------------------------------------------
// 12. recalculateManifestTotals
// ---------------------------------------------------------------------------

export async function recalculateManifestTotals(
  manifestId: string,
): Promise<void> {
  const sb = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items, error } = await (sb.from('manifest_items') as any)
    .select('subtotal, discount, total_price')
    .eq('manifest_id', manifestId)

  if (error) {
    logger.error('Failed to fetch items for total recalculation', {
      manifestId,
      error: error.message,
    })
    return
  }

  let subtotal = 0
  let totalDiscounts = 0
  let total = 0

  for (const item of items ?? []) {
    subtotal += Number(item.subtotal)
    totalDiscounts += Number(item.discount)
    total += Number(item.total_price)
  }

  // Fetch current manifest for taxes and credits (set separately)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: manifest } = await (sb.from('manifests') as any)
    .select('taxes, credits')
    .eq('id', manifestId)
    .single()

  const taxes = Number(manifest?.taxes ?? 0)
  const credits = Number(manifest?.credits ?? 0)
  const grandTotal = roundMoney(total + taxes - credits)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('manifests') as any)
    .update({
      subtotal: roundMoney(subtotal),
      discounts: roundMoney(totalDiscounts),
      total: roundMoney(grandTotal),
    })
    .eq('id', manifestId)
}

// ---------------------------------------------------------------------------
// 13. getManifestHistory
// ---------------------------------------------------------------------------

export async function getManifestHistory(
  manifestId: string,
): Promise<AuditEntry[]> {
  const sb = await createSupabaseServerClient()

  const { data, error } = await sb
    .from('audit_log')
    .select('id, employee_id, event_type, metadata, created_at')
    .eq('entity_type', 'manifest')
    .eq('entity_id', manifestId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw new AppError('HISTORY_FAILED', 'Failed to fetch manifest history', error, 500)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any): AuditEntry => ({
    id: row.id,
    employee_id: row.employee_id,
    event_type: row.event_type,
    metadata: row.metadata,
    created_at: row.created_at,
  }))
}

export interface AuditEntry {
  id: string
  employee_id: string | null
  event_type: string
  metadata: Record<string, unknown> | null
  created_at: string
}

// ---------------------------------------------------------------------------
// 14. exportManifestItems
// ---------------------------------------------------------------------------

export async function exportManifestItems(
  manifestId: string,
): Promise<string> {
  const detail = await getManifestDetail(manifestId)

  const headers = [
    'SKU',
    'Description',
    'Package ID',
    'Quantity',
    'Accepted Quantity',
    'Batch',
    'Brand',
    'Unit Price',
    'Subtotal',
    'Discount',
    'Total Price',
  ]

  const rows = detail.items.map((item) => [
    csvEscape(item.sku ?? ''),
    csvEscape(item.description),
    csvEscape(item.package_id ?? ''),
    String(item.quantity),
    item.accepted_quantity !== null ? String(item.accepted_quantity) : '',
    csvEscape(item.batch ?? ''),
    csvEscape(item.brand ?? ''),
    formatCurrency(item.unit_price),
    formatCurrency(item.subtotal),
    formatCurrency(item.discount),
    formatCurrency(item.total_price),
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

// ---------------------------------------------------------------------------
// 15. exportManifestList
// ---------------------------------------------------------------------------

export async function exportManifestList(
  orgId: string,
  filters: ManifestListFilters = {},
): Promise<string> {
  // Fetch all matching manifests (override pagination to get all)
  const allFilters: ManifestListFilters = {
    ...filters,
    page: 1,
    per_page: 250,
  }

  const allManifests: ManifestRow[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    allFilters.page = page
    const result = await listManifests(orgId, allFilters)
    allManifests.push(...result.manifests)
    hasMore = allManifests.length < result.total
    page++
    // Safety: cap at 10,000 rows
    if (allManifests.length >= 10000) break
  }

  const headers = [
    'Title',
    'Customer',
    'Type',
    'Status',
    'Tab',
    'Receipt #',
    'Created Date',
    'Completed Date',
    'Total Items',
    'Subtotal',
    'Taxes',
    'Discounts',
    'Credits',
    'Total',
  ]

  const rows = allManifests.map((m) => [
    csvEscape(m.title),
    csvEscape(m.customer_name ?? ''),
    m.type,
    m.status,
    m.tab,
    String(m.manifest_number),
    m.created_date,
    m.completed_date ?? '',
    String(m.item_count ?? 0),
    formatCurrency(m.subtotal),
    formatCurrency(m.taxes),
    formatCurrency(m.discounts),
    formatCurrency(m.credits),
    formatCurrency(m.total),
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

// ---------------------------------------------------------------------------
// Internal: CSV escape
// ---------------------------------------------------------------------------

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ---------------------------------------------------------------------------
// Internal: Map DB rows to typed interfaces
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapManifestDetail(row: any, items: any[]): ManifestDetail {
  return {
    id: row.id,
    organization_id: row.organization_id,
    title: row.title,
    manifest_number: row.manifest_number,
    biotrack_manifest_id: row.biotrack_manifest_id ?? null,
    source_location_id: row.source_location_id ?? null,
    destination_location_id: row.destination_location_id ?? null,
    vendor_id: row.vendor_id ?? null,
    customer_name: row.customer_name ?? null,
    type: row.type,
    direction: row.direction,
    tab: row.tab,
    status: row.status,
    created_date: row.created_date,
    completed_date: row.completed_date ?? null,
    last_modified_date: row.last_modified_date ?? row.updated_at,
    subtotal: Number(row.subtotal),
    taxes: Number(row.taxes),
    discounts: Number(row.discounts),
    credits: Number(row.credits),
    total: Number(row.total),
    pickup: row.pickup ?? false,
    stop_number_on_route: row.stop_number_on_route ?? null,
    total_stops_on_route: row.total_stops_on_route ?? null,
    license_number: row.license_number ?? null,
    point_of_contact: row.point_of_contact ?? null,
    driver_name: row.driver_name ?? null,
    driver_id: row.driver_id ?? null,
    notes: row.notes ?? {},
    created_by: row.created_by ?? null,
    items: (items ?? []).map(mapManifestItem),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapManifestItem(row: any): ManifestItemRow {
  return {
    id: row.id,
    manifest_id: row.manifest_id,
    product_id: row.product_id ?? null,
    inventory_item_id: row.inventory_item_id ?? null,
    sku: row.sku ?? null,
    description: row.description,
    package_id: row.package_id ?? null,
    batch: row.batch ?? null,
    brand: row.brand ?? null,
    quantity: Number(row.quantity),
    accepted_quantity: row.accepted_quantity !== null ? Number(row.accepted_quantity) : null,
    unit_price: Number(row.unit_price),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total_price: Number(row.total_price),
    discrepancy_reason: row.discrepancy_reason ?? null,
    sort_order: row.sort_order ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Internal: BioTrack fire-and-forget helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fireBioTrackManifestCreate(manifest: any, items: any[]): Promise<void> {
  try {
    const { getBioTrackClient } = await import('@/lib/biotrack/client')
    const client = getBioTrackClient()

    await client.call(
      'inventory/manifest/create',
      {
        source_location: manifest.source_location_id,
        destination_location: manifest.destination_location_id,
        items: items
          .filter((i) => i.inventory_item_id)
          .map((i) => ({
            inventory_item_id: i.inventory_item_id,
            quantity: Number(i.quantity),
            barcode: i.package_id ?? undefined,
          })),
      },
      {
        organizationId: manifest.organization_id,
        entityType: 'manifest_create',
        entityId: manifest.id,
      },
    )

    // Store the BioTrack manifest ID if returned
    // The client.call response may contain a manifest_id we can store
    logger.info('BioTrack manifest created', { manifestId: manifest.id })
  } catch (err) {
    logger.error('BioTrack manifest creation failed', {
      manifestId: manifest.id,
      error: String(err),
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fireBioTrackManifestAccept(manifest: any, items: any[]): Promise<void> {
  try {
    const { acceptManifestTransfer } = await import('@/lib/biotrack/inventorySync')

    const acceptItems = items
      .filter((i) => i.package_id)
      .map((i) => ({
        barcode: i.package_id as string,
        accepted_quantity: Number(i.accepted_quantity ?? i.quantity),
      }))

    if (acceptItems.length > 0) {
      await acceptManifestTransfer(
        manifest.biotrack_manifest_id,
        acceptItems,
        manifest.organization_id,
      )
    }

    logger.info('BioTrack manifest accepted', { manifestId: manifest.id })
  } catch (err) {
    logger.error('BioTrack manifest acceptance failed', {
      manifestId: manifest.id,
      error: String(err),
    })
  }
}
