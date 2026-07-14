import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { DutchieClient } from './client'
import { loadDutchieConfig, updateSyncTimestamp, clearDutchieConfigCache } from './configLoader'
import { mapEmployee } from './mappers/employeeMapper'
import { mapCustomer } from './mappers/customerMapper'
import { mapProduct } from './mappers/productMapper'
import { mapInventoryItem } from './mappers/inventoryMapper'
import { mapRoom } from './mappers/roomMapper'
import { mapTransaction } from './mappers/transactionMapper'
import {
  mapBrand, mapStrain, mapVendor, mapCategory,
  mapTag, mapPricingTier, mapTerminal,
} from './mappers/referenceMapper'
import type { SyncResult, LocationSyncResult, EntityType, DutchieProduct, DutchieTransaction } from './types'
import { syncLoyalty } from './loyaltySync'
import { ENTITY_ENABLED_KEY, ORG_WIDE_ENTITIES, utcDayEndExclusive, utcDayStart } from './syncPolicy'
import { acquireSyncLease, completeSyncLease, heartbeatSyncLease } from './syncLease'
import { checkpointSuccessfulSync, loadSyncState, saveSyncCursor } from './syncState'
import { upsertWithBisection } from './batchIsolation'

const BATCH_SIZE = 1000
const resultLeases = new WeakMap<SyncResult, string>()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptySyncResult(entityType: string, syncType: 'full' | 'incremental'): SyncResult {
  return { entityType, syncType, fetched: 0, created: 0, updated: 0, skipped: 0, errored: 0, errors: [], durationMs: 0 }
}

async function createSyncLog(
  sb: ReturnType<typeof Object>,
  locationId: string,
  organizationId: string,
  entityType: EntityType,
  syncType: 'full' | 'incremental',
): Promise<string> {
  return acquireSyncLease(sb, { locationId, organizationId, entityType, syncType })
}

async function completeSyncLog(
  sb: ReturnType<typeof Object>,
  logId: string,
  result: SyncResult,
): Promise<void> {
  await completeSyncLease(sb, logId, result)
}

async function batchUpsert<T extends object>(
  sb: ReturnType<typeof Object>,
  table: string,
  rows: T[],
  conflictColumns: string,
  result: SyncResult,
): Promise<void> {
  // Deduplicate rows by conflict key to avoid "cannot affect row a second time"
  const conflictKeys = conflictColumns.split(',').map(k => k.trim())
  const seen = new Set<string>()
  const deduped: Record<string, unknown>[] = []
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i] as Record<string, unknown> | undefined
    if (!row) continue
    const key = conflictKeys.map(k => String(row[k] ?? '')).join('|')
    if (seen.has(key)) { result.skipped++; continue }
    seen.add(key)
    deduped.push(row)
  }
  deduped.reverse()

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE)
    const isolated = await upsertWithBisection(
      batch,
      async candidateRows => {
        const { error } = await (sb as any).from(table)
          .upsert(candidateRows, { onConflict: conflictColumns, ignoreDuplicates: false })
          .select('id')
        if (error) throw new Error(error.message)
      },
      row => conflictKeys.map(key => String(row[key] ?? '')).join('|'),
    )
    result.updated += isolated.persisted
    result.errored += isolated.failed.length
    for (const failure of isolated.failed) {
      const message = `${table} record ${failure.key}: ${failure.error}`
      result.errors.push(message)
      logger.error('Batch upsert record quarantined', { table, key: failure.key, error: failure.error })
    }
    const leaseId = resultLeases.get(result)
    if (leaseId) await heartbeatSyncLease(sb, leaseId)
  }
}

async function checkpointIfSuccessful(
  sb: ReturnType<typeof Object>,
  result: SyncResult,
  locationId: string,
  organizationId: string,
  entityType: EntityType,
  startedAt: number,
): Promise<void> {
  if (result.errored > 0) return
  const checkpoint = new Date(startedAt)
  try {
    await checkpointSuccessfulSync(sb, {
      organizationId,
      locationId,
      entityType,
      checkpoint,
    })
    if (entityType !== 'registers') {
      await updateSyncTimestamp(locationId, entityType, checkpoint)
    }
  } catch (error) {
    handleSyncError(error, result)
  }
}

type LoadedDutchieConfig = NonNullable<Awaited<ReturnType<typeof loadDutchieConfig>>>

async function getClient(
  locationId: string,
  organizationId: string,
): Promise<{ client: DutchieClient; config: LoadedDutchieConfig } | null> {
  const config = await loadDutchieConfig(locationId, organizationId)
  if (!config || !config.isEnabled || !config.apiKey) return null
  return { client: new DutchieClient(config.apiKey), config }
}

// ---------------------------------------------------------------------------
// syncEmployees
// ---------------------------------------------------------------------------

export async function syncEmployees(locationId: string, organizationId: string): Promise<SyncResult> {
  const start = Date.now()
  const setup = await getClient(locationId, organizationId)
  if (!setup) return { ...emptySyncResult('employees', 'full'), durationMs: Date.now() - start }
  const { client, config } = setup

  const syncType: 'full' | 'incremental' = config.lastSyncedEmployeesAt ? 'incremental' : 'full'
  const result = emptySyncResult('employees', syncType)
  const sb = await createSupabaseServerClient()
  const logId = await createSyncLog(sb, locationId, organizationId, 'employees', syncType)
  resultLeases.set(result, logId)

  try {
    const dutchieEmployees = await client.fetchEmployees()
    result.fetched = dutchieEmployees.length

    const mapped = dutchieEmployees.map((e) => mapEmployee(e, organizationId))
    const valid = filterValid(mapped, 'dutchie_employee_id', result)

    await batchUpsert(sb, 'employees', valid, 'organization_id,dutchie_employee_id', result)
    await syncEmployeeLocations(sb, locationId, organizationId, dutchieEmployees)
  } catch (err) {
    handleSyncError(err, result)
  }

  await checkpointIfSuccessful(sb, result, locationId, organizationId, 'employees', start)

  result.durationMs = Date.now() - start
  await completeSyncLog(sb, logId, result)
  logger.info('syncEmployees complete', { locationId, ...result })
  return result
}

async function syncEmployeeLocations(
  sb: ReturnType<typeof Object>,
  locationId: string,
  organizationId: string,
  dutchieEmployees: Array<Record<string, unknown>>,
): Promise<void> {
  const { data: employees, error: employeesError } = await (sb as any).from('employees')
    .select('id, dutchie_employee_id')
    .eq('organization_id', organizationId)
    .not('dutchie_employee_id', 'is', null)
  if (employeesError) throw employeesError

  if (!employees?.length) return
  // dutchie_employee_id is stored as string in DB
  const idMap = new Map<string, string>()
  for (const emp of employees) {
    idMap.set(String(emp.dutchie_employee_id), emp.id)
  }

  const junctionRows = dutchieEmployees
    .map((de) => {
      const dutchieId = String(de.userId ?? de.employeeId ?? '')
      return idMap.has(dutchieId) ? { employee_id: idMap.get(dutchieId), location_id: locationId } : null
    })
    .filter(Boolean)

  // Deduplicate by employee_id (Dutchie returns same employee multiple times)
  const seen = new Set<string>()
  const uniqueRows = junctionRows.filter((r) => {
    const eid = (r as { employee_id: string }).employee_id
    if (seen.has(eid)) return false
    seen.add(eid)
    return true
  })

  if (uniqueRows.length > 0) {
    const { error } = await (sb as any).from('employee_locations')
      .upsert(uniqueRows, { onConflict: 'employee_id,location_id', ignoreDuplicates: true })
    if (error) throw error
  }
}

// ---------------------------------------------------------------------------
// syncCustomers
// ---------------------------------------------------------------------------

export async function syncCustomers(
  locationId: string,
  organizationId: string,
  options: { deadline?: number } = {},
): Promise<SyncResult> {
  const start = Date.now()
  const setup = await getClient(locationId, organizationId)
  if (!setup) return { ...emptySyncResult('customers', 'full'), durationMs: Date.now() - start }
  const { client, config } = setup

  const sb = await createSupabaseServerClient()
  const state = await loadSyncState(sb, organizationId, null, 'customers')
  const checkpoint = state?.lastSyncedAt ?? config.lastSyncedCustomersAt
  const syncType: 'full' | 'incremental' = checkpoint ? 'incremental' : 'full'
  const result = emptySyncResult('customers', syncType)
  const logId = await createSyncLog(sb, locationId, organizationId, 'customers', syncType)
  resultLeases.set(result, logId)

  try {
    const since = checkpoint ?? undefined
    const dutchieCustomers = await client.fetchCustomers(since, options.deadline)
    result.fetched = dutchieCustomers.length

    const mapped = dutchieCustomers.map((c) => mapCustomer(c, organizationId))
    const valid = filterValid(mapped, 'dutchie_customer_id', result)

    await dedupAndUpsertCustomers(sb, organizationId, valid, result)
  } catch (err) {
    handleSyncError(err, result)
  }

  await checkpointIfSuccessful(sb, result, locationId, organizationId, 'customers', start)

  result.durationMs = Date.now() - start
  await completeSyncLog(sb, logId, result)
  logger.info('syncCustomers complete', { locationId, ...result })
  return result
}

async function dedupAndUpsertCustomers(
  sb: ReturnType<typeof Object>,
  organizationId: string,
  mapped: Array<{ email?: unknown; dutchie_customer_id?: unknown }>,
  result: SyncResult,
): Promise<void> {
  // Load existing customers that have email but no dutchie_customer_id
  const emailsToCheck = mapped
    .filter((c) => c.email && !c.dutchie_customer_id)
    .map((c) => c.email as string)

  const emailMap = new Map<string, string>()
  if (emailsToCheck.length > 0) {
    const { data: existing } = await (sb as any).from('customers')
      .select('id, email')
      .eq('organization_id', organizationId)
      .is('dutchie_customer_id', null)
      .in('email', emailsToCheck)

    for (const row of existing ?? []) {
      if (row.email) emailMap.set(row.email.toLowerCase(), row.id)
    }
  }

  // Stamp dutchie_customer_id on email-matched rows
  const toUpdate: Array<{ id: string; dutchie_customer_id: number }> = []
  const toUpsert: Record<string, unknown>[] = []

  for (const record of mapped) {
    const email = (record.email as string | null)?.toLowerCase()
    if (email && emailMap.has(email)) {
      toUpdate.push({
        id: emailMap.get(email)!,
        dutchie_customer_id: record.dutchie_customer_id as number,
      })
    }
    toUpsert.push(record as Record<string, unknown>)
  }

  if (toUpdate.length > 0) {
    const { error } = await (sb as any).rpc('stamp_dutchie_customer_ids', {
      p_org: organizationId,
      p_matches: toUpdate,
    })
    if (error) {
      result.errored += toUpdate.length
      result.errors.push(`Customer identity matching: ${error.message}`)
      return
    }
  }

  // Batch upsert all
  await batchUpsert(sb, 'customers', toUpsert, 'organization_id,dutchie_customer_id', result)
}

// ---------------------------------------------------------------------------
// syncProducts
// ---------------------------------------------------------------------------

export async function syncProducts(
  locationId: string,
  organizationId: string,
  options: { deadline?: number } = {},
): Promise<SyncResult> {
  const start = Date.now()
  const setup = await getClient(locationId, organizationId)
  if (!setup) return { ...emptySyncResult('products', 'full'), durationMs: Date.now() - start }
  const { client, config } = setup

  const sb = await createSupabaseServerClient()
  const state = await loadSyncState(sb, organizationId, locationId, 'products')
  const checkpoint = state?.lastSyncedAt ?? config.lastSyncedProductsAt
  const syncType: 'full' | 'incremental' = checkpoint ? 'incremental' : 'full'
  const result = emptySyncResult('products', syncType)
  const logId = await createSyncLog(sb, locationId, organizationId, 'products', syncType)
  resultLeases.set(result, logId)

  try {
    const since = checkpoint ?? undefined
    const dutchieProducts = await client.fetchProducts(since, options.deadline)
    result.fetched = dutchieProducts.length

    // Phase 1: resolve FK lookups + pre-create missing FKs in bulk
    const fkCache = await buildProductFkCache(sb, organizationId)
    await bulkResolveNewFks(sb, fkCache, dutchieProducts, organizationId)

    // Phase 2: map products (all FK lookups are now in-memory)
    const productRows: Record<string, unknown>[] = []
    const priceRows: Array<{ dutchie_product_id: number; row: Record<string, unknown> }> = []

    for (const dp of dutchieProducts) {
      try {
        const { product, locationPrice } = mapProduct(dp, organizationId, locationId)
        product.brand_id = resolveFkSync(fkCache, 'brands', dp.brandName, dp.brandId)
        product.vendor_id = resolveFkSync(fkCache, 'vendors', dp.vendorName, dp.vendorId)
        product.strain_id = resolveFkSync(fkCache, 'strains', dp.strain, dp.strainId)
        product.category_id = resolveCategoryFkSync(fkCache, dp.category, dp.categoryId)
        productRows.push(product as unknown as Record<string, unknown>)
        priceRows.push({ dutchie_product_id: dp.productId, row: locationPrice as unknown as Record<string, unknown> })
      } catch (err) {
        result.errored++
        result.errors.push(`Product ${dp.productId}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // Phase 2 upsert products
    await batchUpsert(sb, 'products', productRows, 'organization_id,dutchie_product_id', result)

    // Phase 3: upsert location_product_prices
    await upsertLocationPrices(sb, organizationId, locationId, priceRows, result)
  } catch (err) {
    handleSyncError(err, result)
  }

  await checkpointIfSuccessful(sb, result, locationId, organizationId, 'products', start)

  result.durationMs = Date.now() - start
  await completeSyncLog(sb, logId, result)
  logger.info('syncProducts complete', { locationId, ...result })
  return result
}

interface FkCache {
  brands: Map<string, string>
  vendors: Map<string, string>
  strains: Map<string, string>
  categories: Map<string, string>
}

async function buildProductFkCache(sb: ReturnType<typeof Object>, orgId: string): Promise<FkCache> {
  const cache: FkCache = { brands: new Map(), vendors: new Map(), strains: new Map(), categories: new Map() }

  const [brands, vendors, strains, categories] = await Promise.all([
    (sb as any).from('brands').select('id, name, external_id').eq('organization_id', orgId).limit(10000),
    (sb as any).from('vendors').select('id, name, external_id').eq('organization_id', orgId).limit(10000),
    (sb as any).from('strains').select('id, name, external_id').eq('organization_id', orgId).limit(10000),
    (sb as any).from('product_categories').select('id, name, external_id').eq('organization_id', orgId).limit(10000),
  ])
  const lookupError = [brands, vendors, strains, categories].find(result => result.error)?.error
  if (lookupError) throw lookupError

  for (const b of brands.data ?? []) {
    cache.brands.set(b.name?.toLowerCase(), b.id)
    if (b.external_id) cache.brands.set(`ext:${b.external_id}`, b.id)
  }
  for (const v of vendors.data ?? []) {
    cache.vendors.set(v.name?.toLowerCase(), v.id)
    if (v.external_id) cache.vendors.set(`ext:${v.external_id}`, v.id)
  }
  for (const s of strains.data ?? []) {
    cache.strains.set(s.name?.toLowerCase(), s.id)
    if (s.external_id) cache.strains.set(`ext:${s.external_id}`, s.id)
  }
  for (const c of categories.data ?? []) {
    cache.categories.set(c.name?.toLowerCase(), c.id)
    if (c.external_id) cache.categories.set(`ext:${c.external_id}`, c.id)
  }

  return cache
}

/**
 * Pre-creates all missing brands, vendors, strains, and categories in bulk
 * so the per-product mapping loop needs zero DB calls.
 */
async function bulkResolveNewFks(
  sb: ReturnType<typeof Object>,
  cache: FkCache,
  products: DutchieProduct[],
  orgId: string,
): Promise<void> {
  // Collect unique names not in cache
  const missing: Record<'brands' | 'vendors' | 'strains', Map<string, { name: string; externalId: string | null }>> = {
    brands: new Map(), vendors: new Map(), strains: new Map(),
  }
  const missingCategories = new Map<string, { name: string; externalId: string | null }>()

  for (const dp of products) {
    for (const [table, nameVal, extId] of [
      ['brands', dp.brandName, dp.brandId],
      ['vendors', dp.vendorName, dp.vendorId],
      ['strains', dp.strain, dp.strainId],
    ] as const) {
      if (!nameVal) continue
      const key = nameVal.toLowerCase()
      if (cache[table].has(key) || (extId && cache[table].has(`ext:${extId}`))) continue
      missing[table].set(key, { name: nameVal, externalId: extId ? String(extId) : null })
    }
    const catName = dp.category || 'Uncategorized'
    const catKey = catName.toLowerCase()
    if (!cache.categories.has(catKey) && !(dp.categoryId && cache.categories.has(`ext:${dp.categoryId}`))) {
      missingCategories.set(catKey, { name: catName, externalId: dp.categoryId ? String(dp.categoryId) : null })
    }
  }

  // Bulk upsert each FK table
  for (const table of ['brands', 'vendors', 'strains'] as const) {
    const rows = [...missing[table].values()]
    if (rows.length === 0) continue
    const upsertRows = rows.map(r => ({ organization_id: orgId, name: r.name, external_id: r.externalId }))
    for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
      const batch = upsertRows.slice(i, i + BATCH_SIZE)
      const { data, error } = await (sb as any).from(table)
        .upsert(batch, { onConflict: 'organization_id,name', ignoreDuplicates: false })
        .select('id, name, external_id')
      if (error) throw error
      for (const row of data ?? []) {
        cache[table].set(row.name?.toLowerCase(), row.id)
        if (row.external_id) cache[table].set(`ext:${row.external_id}`, row.id)
      }
    }
  }

  // Bulk upsert categories
  if (missingCategories.size > 0) {
    const catRows = [...missingCategories.values()].map(r => {
      const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      return {
        organization_id: orgId,
        name: r.name,
        slug: r.externalId ? `${slug}-d${r.externalId}` : slug,
        available_for: 'all',
        external_id: r.externalId,
      }
    })
    for (let i = 0; i < catRows.length; i += BATCH_SIZE) {
      const batch = catRows.slice(i, i + BATCH_SIZE)
      const { data, error } = await (sb as any).from('product_categories')
        .upsert(batch, { onConflict: 'organization_id,slug', ignoreDuplicates: false })
        .select('id, name, external_id')
      if (error) throw error
      for (const row of data ?? []) {
        cache.categories.set(row.name?.toLowerCase(), row.id)
        if (row.external_id) cache.categories.set(`ext:${row.external_id}`, row.id)
      }
    }
  }
}

function resolveFkSync(
  cache: FkCache,
  table: 'brands' | 'vendors' | 'strains',
  name: string | null,
  externalId: number | null,
): string | null {
  if (!name && !externalId) return null
  if (externalId) {
    const cached = cache[table].get(`ext:${externalId}`)
    if (cached) return cached
  }
  if (name) {
    const cached = cache[table].get(name.toLowerCase())
    if (cached) return cached
  }
  return null
}

function resolveCategoryFkSync(
  cache: FkCache,
  name: string | null,
  externalId: number | null,
): string | null {
  const categoryName = name || 'Uncategorized'
  if (externalId) {
    const cached = cache.categories.get(`ext:${externalId}`)
    if (cached) return cached
  }
  return cache.categories.get(categoryName.toLowerCase()) ?? null
}

async function resolveFk(
  sb: ReturnType<typeof Object>,
  cache: FkCache,
  table: 'brands' | 'vendors' | 'strains',
  name: string | null,
  externalId: number | null,
  orgId: string,
): Promise<string | null> {
  if (!name && !externalId) return null

  // Check cache by external_id first, then name
  if (externalId) {
    const cached = cache[table].get(`ext:${externalId}`)
    if (cached) return cached
  }
  if (name) {
    const cached = cache[table].get(name.toLowerCase())
    if (cached) return cached
  }

  // Auto-create missing
  if (!name) return null
  const row: Record<string, unknown> = {
    organization_id: orgId,
    name,
    external_id: externalId ? String(externalId) : null,
  }

  const { data } = await (sb as any).from(table).upsert(row, {
    onConflict: 'organization_id,name',
    ignoreDuplicates: false,
  }).select('id').single()

  if (data?.id) {
    cache[table].set(name.toLowerCase(), data.id)
    if (externalId) cache[table].set(`ext:${externalId}`, data.id)
    return data.id
  }
  return null
}

async function resolveCategoryFk(
  sb: ReturnType<typeof Object>,
  cache: FkCache,
  name: string | null,
  externalId: number | null,
  orgId: string,
): Promise<string> {
  const categoryName = name || 'Uncategorized'

  if (externalId) {
    const cached = cache.categories.get(`ext:${externalId}`)
    if (cached) return cached
  }
  const cached = cache.categories.get(categoryName.toLowerCase())
  if (cached) return cached

  // Auto-create
  const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const row: Record<string, unknown> = {
    organization_id: orgId,
    name: categoryName,
    slug: externalId ? `${slug}-d${externalId}` : slug,
    available_for: 'all',
    external_id: externalId ? String(externalId) : null,
  }

  const { data } = await (sb as any).from('product_categories').upsert(row, {
    onConflict: 'organization_id,slug',
    ignoreDuplicates: false,
  }).select('id').single()

  if (data?.id) {
    cache.categories.set(categoryName.toLowerCase(), data.id)
    if (externalId) cache.categories.set(`ext:${externalId}`, data.id)
    return data.id
  }

  // Last resort: find or create Uncategorized
  const { data: fallback } = await (sb as any).from('product_categories')
    .select('id')
    .eq('organization_id', orgId)
    .eq('name', 'Uncategorized')
    .single()

  return fallback?.id ?? ''
}

async function upsertLocationPrices(
  sb: ReturnType<typeof Object>,
  orgId: string,
  locationId: string,
  priceRows: Array<{ dutchie_product_id: number; row: Record<string, unknown> }>,
  result: SyncResult,
): Promise<void> {
  // Reuse the paginated product map instead of a massive .in() query
  const productMap = await buildDutchieProductMap(sb, orgId)

  const rows: Record<string, unknown>[] = []
  for (const pr of priceRows) {
    const productId = productMap.get(pr.dutchie_product_id)
    if (!productId) {
      result.skipped++
      continue
    }
    rows.push({ ...pr.row, product_id: productId, location_id: locationId })
  }

  await batchUpsert(sb, 'location_product_prices', rows, 'product_id,location_id', result)
}

// ---------------------------------------------------------------------------
// syncInventory
// ---------------------------------------------------------------------------

export async function syncInventory(
  locationId: string,
  organizationId: string,
  options: { deadline?: number } = {},
): Promise<SyncResult> {
  const start = Date.now()
  const setup = await getClient(locationId, organizationId)
  if (!setup) return { ...emptySyncResult('inventory', 'full'), durationMs: Date.now() - start }
  const { client } = setup

  const result = emptySyncResult('inventory', 'full')
  const sb = await createSupabaseServerClient()
  const logId = await createSyncLog(sb, locationId, organizationId, 'inventory', 'full')
  resultLeases.set(result, logId)

  try {
    const dutchieItems = await client.fetchInventory({
      includeLabResults: true,
      includeRoomQuantities: true,
      deadline: options.deadline,
    })
    result.fetched = dutchieItems.length

    // Build product_id lookup from dutchie_product_id
    const productIdMap = await buildDutchieProductMap(sb, organizationId)
    logger.info('Inventory product map built', { mapSize: productIdMap.size })

    // Build room lookup by name
    const roomMap = await buildRoomMap(sb, locationId)

    // Map all items
    const mapped: Array<Record<string, unknown> & { external_package_id: string | null }> = []
    for (const di of dutchieItems) {
      try {
        const item = mapInventoryItem(di, locationId)
        item.product_id = productIdMap.get(di.productId) ?? null
        // Room: try di.room first, then extract from roomQuantities array
        const roomName = di.room
          ?? (Array.isArray((di as Record<string, unknown>).roomQuantities)
            ? ((di as Record<string, unknown>).roomQuantities as Array<Record<string, unknown>>)[0]?.room as string | null
            : null)
        item.room_id = roomName ? (roomMap.get(roomName.toLowerCase()) ?? null) : null
        const row = { ...item, organization_id: organizationId } as Record<string, unknown> & { external_package_id: string | null }
        mapped.push(row)
      } catch (err) {
        result.errored++
        result.errors.push(`Inventory ${di.inventoryId}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // Load existing inventory for this location
    const { data: existing } = await (sb as any).from('inventory_items')
      .select('id, external_package_id')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .limit(50000)

    const existingMap = new Map<string, string>()
    for (const row of existing ?? []) {
      if (row.external_package_id) existingMap.set(row.external_package_id, row.id)
    }

    // Diff: new, update, soft-delete
    const incomingIds = new Set<string>()
    const toUpsert: Record<string, unknown>[] = []

    for (const item of mapped) {
      if (item.external_package_id) incomingIds.add(item.external_package_id)
      if (!item.product_id) { result.skipped++; continue }
      toUpsert.push({ ...item, is_active: true })
    }

    await batchUpsert(sb, 'inventory_items', toUpsert, 'location_id,external_package_id', result)

    // Soft-delete items missing from Dutchie
    const toDeactivate = [...existingMap.entries()]
      .filter(([extId]) => !incomingIds.has(extId))
      .map(([, id]) => id)

    if (toDeactivate.length > 0) {
      await softDeleteBatch(sb, 'inventory_items', toDeactivate)
      result.updated += toDeactivate.length
    }

  } catch (err) {
    handleSyncError(err, result)
  }

  await checkpointIfSuccessful(sb, result, locationId, organizationId, 'inventory', start)

  result.durationMs = Date.now() - start
  await completeSyncLog(sb, logId, result)
  logger.info('syncInventory complete', { locationId, ...result })
  return result
}

async function buildDutchieProductMap(sb: ReturnType<typeof Object>, orgId: string): Promise<Map<number, string>> {
  // Paginate in chunks of 1000 (Supabase max-rows default)
  const map = new Map<number, string>()
  let offset = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await (sb as any).from('products')
      .select('id, dutchie_product_id')
      .eq('organization_id', orgId)
      .not('dutchie_product_id', 'is', null)
      .order('dutchie_product_id', { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    for (const p of data) map.set(p.dutchie_product_id, p.id)
    if (data.length < pageSize) break
    offset += pageSize
  }
  return map
}

async function buildRoomMap(sb: ReturnType<typeof Object>, locationId: string): Promise<Map<string, string>> {
  const { data, error } = await (sb as any).from('rooms')
    .select('id, name')
    .eq('location_id', locationId)
    .eq('is_active', true)
  if (error) throw error

  const map = new Map<string, string>()
  for (const r of data ?? []) map.set(r.name?.toLowerCase(), r.id)
  return map
}

async function softDeleteBatch(sb: ReturnType<typeof Object>, table: string, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE)
    const { error } = await (sb as any).from(table)
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .in('id', batch)
    if (error) throw error
  }
}

// ---------------------------------------------------------------------------
// syncRooms
// ---------------------------------------------------------------------------

export async function syncRooms(locationId: string, organizationId: string): Promise<SyncResult> {
  const start = Date.now()
  const setup = await getClient(locationId, organizationId)
  if (!setup) return { ...emptySyncResult('rooms', 'full'), durationMs: Date.now() - start }
  const { client } = setup

  const result = emptySyncResult('rooms', 'full')
  const sb = await createSupabaseServerClient()
  const logId = await createSyncLog(sb, locationId, organizationId, 'rooms', 'full')
  resultLeases.set(result, logId)

  try {
    const dutchieRooms = await client.fetchRooms()
    result.fetched = dutchieRooms.length

    // Load existing rooms — need both name and external_id for matching
    const mappedRooms = dutchieRooms.map(dutchieRoom => mapRoom(dutchieRoom, locationId))
    const roomRows = mappedRooms.map(({ room }) => ({ ...room, is_active: true }))
    await batchUpsert(sb, 'rooms', roomRows, 'location_id,name', result)

    const { data: existing, error: roomsError } = await (sb as any).from('rooms')
      .select('id, name, external_id')
      .eq('location_id', locationId)
    if (roomsError) throw roomsError

    const byExternalId = new Map<string, string>()
    const byName = new Map<string, { id: string; external_id: string | null }>()
    for (const row of existing ?? []) {
      if (row.external_id) byExternalId.set(row.external_id, row.id)
      byName.set(row.name, { id: row.id, external_id: row.external_id })
    }

    const incomingExternalIds = new Set<string>()
    const allSubroomRows: Record<string, unknown>[] = []

    for (const dr of dutchieRooms) {
      try {
        const { room, subrooms } = mapRoom(dr, locationId)
        const extId = room.external_id
        incomingExternalIds.add(extId)

        // Step 1: Check if a seeded room with the same name exists but has null external_id
        const nameMatch = byName.get(room.name)
        if (nameMatch && !nameMatch.external_id) {
          // Stamp external_id on the existing seeded room
          byExternalId.set(extId, nameMatch.id)

          // Upsert subrooms
          if (subrooms.length > 0) {
            allSubroomRows.push(...subrooms.map((subroom) => ({ ...subroom, room_id: nameMatch.id })))
          }
          continue
        }

        // Step 2: Check if room exists by external_id
        const existingId = byExternalId.get(extId)
        if (existingId) {
          // Update existing
          if (subrooms.length > 0) {
            allSubroomRows.push(...subrooms.map((subroom) => ({ ...subroom, room_id: existingId })))
          }
          continue
        }

        // Step 3: New room — insert
        result.errored++
        result.errors.push(`Room ${dr.roomId}: room missing after batch upsert`)
      } catch (err) {
        result.errored++
        result.errors.push(`Room ${dr.roomId}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    await batchUpsert(sb, 'subrooms', allSubroomRows, 'room_id,name', result)

    // Soft-deactivate rooms removed from Dutchie (only ones that have external_id)
    const toDeactivate = [...byExternalId.entries()]
      .filter(([extId]) => !incomingExternalIds.has(extId))
      .map(([, id]) => id)

    if (toDeactivate.length > 0) {
      await softDeleteBatch(sb, 'rooms', toDeactivate)
      result.updated += toDeactivate.length
    }

  } catch (err) {
    handleSyncError(err, result)
  }

  await checkpointIfSuccessful(sb, result, locationId, organizationId, 'rooms', start)

  result.durationMs = Date.now() - start
  await completeSyncLog(sb, logId, result)
  logger.info('syncRooms complete', { locationId, ...result })
  return result
}

// ---------------------------------------------------------------------------
// syncReferenceData
// ---------------------------------------------------------------------------

export async function syncReferenceData(
  locationId: string,
  organizationId: string,
  options: { deadline?: number } = {},
): Promise<SyncResult> {
  const start = Date.now()
  const setup = await getClient(locationId, organizationId)
  if (!setup) return { ...emptySyncResult('reference', 'full'), durationMs: Date.now() - start }
  const { client } = setup

  const result = emptySyncResult('reference', 'full')
  const sb = await createSupabaseServerClient()
  const logId = await createSyncLog(sb, locationId, organizationId, 'reference', 'full')
  resultLeases.set(result, logId)

  try {
    const checkDeadline = () => {
      if (options.deadline && Date.now() >= options.deadline) throw new Error('Dutchie sync deadline reached')
    }
    checkDeadline()
    await syncBrands(sb, client, organizationId, result)
    checkDeadline()
    await syncStrains(sb, client, organizationId, result)
    checkDeadline()
    await syncVendors(sb, client, organizationId, result)
    checkDeadline()
    await syncCategories(sb, client, organizationId, result)
    checkDeadline()
    await syncTags(sb, client, organizationId, result)
    checkDeadline()
    await syncPricingTiers(sb, client, organizationId, result)
  } catch (err) {
    handleSyncError(err, result)
  }

  await checkpointIfSuccessful(sb, result, locationId, organizationId, 'reference', start)

  result.durationMs = Date.now() - start
  await completeSyncLog(sb, logId, result)
  logger.info('syncReferenceData complete', { locationId, ...result })
  return result
}

async function syncBrands(sb: ReturnType<typeof Object>, client: DutchieClient, orgId: string, result: SyncResult): Promise<void> {
  const items = await client.fetchBrands()
  result.fetched += items.length
  const rows = items.map((b) => mapBrand(b, orgId))
  // Upsert by name — this stamps external_id on seeded records that matched by name
  await batchUpsert(sb, 'brands', rows as unknown as Record<string, unknown>[], 'organization_id,name', result)
}

async function syncStrains(sb: ReturnType<typeof Object>, client: DutchieClient, orgId: string, result: SyncResult): Promise<void> {
  const items = await client.fetchStrains()
  result.fetched += items.length
  const rows = items.map((s) => mapStrain(s, orgId))
  await batchUpsert(sb, 'strains', rows as unknown as Record<string, unknown>[], 'organization_id,name', result)
}

async function syncVendors(sb: ReturnType<typeof Object>, client: DutchieClient, orgId: string, result: SyncResult): Promise<void> {
  const items = await client.fetchVendors()
  result.fetched += items.length
  const rows = items.map((v) => mapVendor(v, orgId))
  await batchUpsert(sb, 'vendors', rows as unknown as Record<string, unknown>[], 'organization_id,name', result)
}

async function syncCategories(sb: ReturnType<typeof Object>, client: DutchieClient, orgId: string, result: SyncResult): Promise<void> {
  const items = await client.fetchCategories()
  result.fetched += items.length
  const rows = items.map((c) => mapCategory(c, orgId))
  await batchUpsert(sb, 'product_categories', rows as unknown as Record<string, unknown>[], 'organization_id,slug', result)
}

async function syncTags(sb: ReturnType<typeof Object>, client: DutchieClient, orgId: string, result: SyncResult): Promise<void> {
  const items = await client.fetchTags()
  result.fetched += items.length
  const rows = items.map((t) => mapTag(t, orgId, 'product'))
  await batchUpsert(sb, 'tags', rows as unknown as Record<string, unknown>[], 'organization_id,name,tag_type', result)
}

async function syncPricingTiers(sb: ReturnType<typeof Object>, client: DutchieClient, orgId: string, result: SyncResult): Promise<void> {
  const items = await client.fetchPricingTiers()
  result.fetched += items.length
  const rows = items.map((p) => mapPricingTier(p, orgId))
  await batchUpsert(sb, 'pricing_tiers', rows as unknown as Record<string, unknown>[], 'organization_id,name', result)
}

async function syncTerminals(sb: ReturnType<typeof Object>, client: DutchieClient, locationId: string, result: SyncResult): Promise<void> {
  const items = await client.fetchTerminals()
  result.fetched += items.length

  // Match seeded registers by name first, stamp external_id
  const rows = items.map(terminal => mapTerminal(terminal, locationId))
  await batchUpsert(
    sb,
    'registers',
    rows as unknown as Record<string, unknown>[],
    'location_id,name',
    result,
  )
}

export async function syncRegisters(locationId: string, organizationId: string): Promise<SyncResult> {
  const start = Date.now()
  const setup = await getClient(locationId, organizationId)
  if (!setup) return { ...emptySyncResult('registers', 'full'), durationMs: Date.now() - start }
  const sb = await createSupabaseServerClient()
  const state = await loadSyncState(sb, organizationId, locationId, 'registers')
  const syncType = state?.lastSyncedAt ? 'incremental' : 'full'
  const result = emptySyncResult('registers', syncType)
  const logId = await createSyncLog(sb, locationId, organizationId, 'registers', syncType)
  resultLeases.set(result, logId)

  try {
    await syncTerminals(sb, setup.client, locationId, result)
    if (result.errored === 0) {
      await checkpointSuccessfulSync(sb, {
        organizationId,
        locationId,
        entityType: 'registers',
        checkpoint: new Date(start),
      })
    }
  } catch (error) {
    handleSyncError(error, result)
  }

  result.durationMs = Date.now() - start
  await completeSyncLog(sb, logId, result)
  logger.info('syncRegisters complete', { locationId, ...result })
  return result
}

// ---------------------------------------------------------------------------
// syncTransactions
// ---------------------------------------------------------------------------

export async function syncTransactions(
  locationId: string,
  organizationId: string,
  options: { deadline?: number } = {},
): Promise<SyncResult> {
  const start = Date.now()
  const setup = await getClient(locationId, organizationId)
  if (!setup) return { ...emptySyncResult('transactions', 'full'), durationMs: Date.now() - start }
  const { client, config } = setup

  const sb = await createSupabaseServerClient()
  const state = await loadSyncState(sb, organizationId, locationId, 'transactions')
  const authoritativeCheckpoint = state?.lastSyncedAt ?? config.lastSyncedTransactionsAt
  const syncType = authoritativeCheckpoint ? 'incremental' : 'full'
  const result = emptySyncResult('transactions', syncType)
  const logId = await createSyncLog(sb, locationId, organizationId, 'transactions', syncType)
  resultLeases.set(result, logId)
  let completedAllWindows = false
  let nextWindowStart: number | null = null
  let transactionRangeEnd = start

  try {
    const cursor = state?.cursor as { windowStart?: string; rangeEnd?: string } | null
    const overlappedStart = authoritativeCheckpoint
      ? new Date(authoritativeCheckpoint.getTime() - 15 * 60 * 1000)
      : new Date(start - 730 * 24 * 60 * 60 * 1000)
    const defaultStart = utcDayStart(overlappedStart)
    let windowStart = cursor?.windowStart ? new Date(cursor.windowStart).getTime() : defaultStart.getTime()
    const rangeEnd = cursor?.rangeEnd
      ? new Date(cursor.rangeEnd).getTime()
      : utcDayEndExclusive(new Date(start)).getTime()
    transactionRangeEnd = rangeEnd
    while (windowStart < rangeEnd) {
      if (options.deadline && Date.now() >= options.deadline) break
      const windowEnd = Math.min(windowStart + 55 * 24 * 60 * 60 * 1000, rangeEnd)
      const startDate = new Date(windowStart).toISOString()
      const endDate = new Date(windowEnd).toISOString()
      logger.info('syncTransactions date range', { startDate: startDate.slice(0, 10), endDate: endDate.slice(0, 10) })
      const chunk = await client.fetchTransactions({ startDate, endDate, endExclusive: true })
      result.fetched += chunk.length
      const errorsBeforeWindow = result.errored
      await persistTransactionBatch(sb, chunk, locationId, organizationId, result)
      if (result.errored > errorsBeforeWindow) break
      windowStart = windowEnd
      await saveSyncCursor(sb, {
        organizationId,
        locationId,
        entityType: 'transactions',
        cursor: windowStart < rangeEnd
          ? { windowStart: new Date(windowStart).toISOString(), rangeEnd: new Date(rangeEnd).toISOString() }
          : null,
      })
      await heartbeatSyncLease(sb, logId)
    }
    completedAllWindows = windowStart >= rangeEnd
    nextWindowStart = windowStart
  } catch (err) {
    handleSyncError(err, result)
  }

  try {
    if (result.errored === 0 && completedAllWindows) {
      await checkpointSuccessfulSync(sb, {
        organizationId,
        locationId,
        entityType: 'transactions',
        checkpoint: new Date(start),
        cursor: null,
      })
      await updateSyncTimestamp(locationId, 'transactions', new Date(start))
    } else if (result.errored === 0) {
      await saveSyncCursor(sb, {
        organizationId,
        locationId,
        entityType: 'transactions',
        cursor: {
          windowStart: new Date(nextWindowStart ?? transactionRangeEnd).toISOString(),
          rangeEnd: new Date(transactionRangeEnd).toISOString(),
        },
      })
    }
  } catch (error) {
    handleSyncError(error, result)
  }

  result.durationMs = Date.now() - start
  await completeSyncLog(sb, logId, result)
  logger.info('syncTransactions complete', { locationId, completedAllWindows, ...result })
  return result
}

async function persistTransactionBatch(
  sb: ReturnType<typeof Object>,
  dutchieTransactions: DutchieTransaction[],
  locationId: string,
  organizationId: string,
  result: SyncResult,
): Promise<void> {
  if (dutchieTransactions.length === 0) return
  const customerMap = await buildPaginatedMap(
    sb,
    'customers',
    'dutchie_customer_id',
    'id',
    { organization_id: organizationId },
  )
  const employeeMap = await buildPaginatedMap(
    sb,
    'employees',
    'dutchie_employee_id',
    'id',
    { organization_id: organizationId },
  )
  const transactionRows: Record<string, unknown>[] = []
  const paymentRows: Array<{
    dutchieTransactionId: string
    payments: Array<{ payment_method: string; amount: number }>
  }> = []

  for (const dutchieTransaction of dutchieTransactions) {
    try {
      const { transaction, payments } = mapTransaction(dutchieTransaction, locationId)
      if (dutchieTransaction.customerId) {
        transaction.customer_id = customerMap.get(String(dutchieTransaction.customerId)) ?? null
      }
      if (dutchieTransaction.employeeId) {
        transaction.employee_id = employeeMap.get(String(dutchieTransaction.employeeId)) ?? null
      }
      transactionRows.push(transaction as unknown as Record<string, unknown>)
      paymentRows.push({
        dutchieTransactionId: String(dutchieTransaction.transactionId),
        payments,
      })
    } catch (error) {
      result.errored++
      result.errors.push(
        `Txn ${dutchieTransaction.transactionId}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  await batchUpsert(
    sb,
    'transactions',
    transactionRows,
    'location_id,dutchie_transaction_id',
    result,
  )
  if (result.errored > 0) return

  const transactionIdMap = await buildPaginatedMap(
    sb,
    'transactions',
    'dutchie_transaction_id',
    'id',
    { location_id: locationId },
  )
  const replacements = paymentRows.flatMap(row => {
    const transactionId = transactionIdMap.get(row.dutchieTransactionId)
    return transactionId ? [{ transaction_id: transactionId, payments: row.payments }] : []
  })
  if (replacements.length > 0) {
    const { error } = await (sb as any).rpc('replace_dutchie_transaction_payments', {
      p_location: locationId,
      p_replacements: replacements,
    })
    if (error) {
      result.errored++
      result.errors.push(`Transaction payments: ${error.message}`)
      return
    }
  }
  await updateCustomerAggregates(sb, organizationId)
}

async function buildPaginatedMap(
  sb: ReturnType<typeof Object>,
  table: string,
  keyCol: string,
  valueCol: string,
  filters: Record<string, string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  let offset = 0
  const pageSize = 1000
  while (true) {
    let query = (sb as any).from(table).select(`${valueCol}, ${keyCol}`).not(keyCol, 'is', null)
    for (const [k, v] of Object.entries(filters)) query = query.eq(k, v)
    const { data, error } = await query.order(keyCol, { ascending: true }).range(offset, offset + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) map.set(String(row[keyCol]), row[valueCol])
    if (data.length < pageSize) break
    offset += pageSize
  }
  return map
}

async function updateCustomerAggregates(sb: ReturnType<typeof Object>, orgId: string): Promise<void> {
  // Use a single SQL call to update all customer aggregates from transactions
  try {
    const { error } = await (sb as any).rpc('update_customer_aggregates_from_transactions', { org_id: orgId })
    if (error) logger.warn('Customer aggregate update skipped', { error: error.message })
  } catch {
    logger.warn('update_customer_aggregates_from_transactions RPC not found, skipping')
  }
}

// ---------------------------------------------------------------------------
// Orchestrators
// ---------------------------------------------------------------------------

const SYNC_ORDER: EntityType[] = ['reference', 'rooms', 'registers', 'employees', 'products', 'customers', 'inventory', 'transactions', 'loyalty']

const SYNC_FN_MAP: Record<EntityType, (locationId: string, organizationId: string) => Promise<SyncResult>> = {
  reference: syncReferenceData,
  rooms: syncRooms,
  registers: syncRegisters,
  employees: syncEmployees,
  products: syncProducts,
  customers: syncCustomers,
  inventory: syncInventory,
  transactions: syncTransactions,
  loyalty: syncLoyalty,
}

export async function syncEntity(
  locationId: string,
  organizationId: string,
  entityType: EntityType,
  options: { deadline?: number } = {},
): Promise<SyncResult> {
  if (entityType === 'transactions') return syncTransactions(locationId, organizationId, options)
  if (entityType === 'loyalty') return syncLoyalty(locationId, organizationId, options)
  if (entityType === 'customers') return syncCustomers(locationId, organizationId, options)
  if (entityType === 'products') return syncProducts(locationId, organizationId, options)
  if (entityType === 'inventory') return syncInventory(locationId, organizationId, options)
  if (entityType === 'reference') return syncReferenceData(locationId, organizationId, options)
  return SYNC_FN_MAP[entityType](locationId, organizationId)
}

export async function syncLocation(
  locationId: string,
  organizationId: string,
  entityTypes?: EntityType[],
): Promise<LocationSyncResult> {
  const start = Date.now()
  const config = await loadDutchieConfig(locationId, organizationId)
  const locationName = config?.dutchieLocationName ?? locationId

  const results: SyncResult[] = []
  const typesToSync = entityTypes ?? SYNC_ORDER

  if (!config) {
    return { locationId, locationName, results, totalDurationMs: Date.now() - start }
  }

  for (const entityType of SYNC_ORDER) {
    if (!typesToSync.includes(entityType)) continue
    const enabledKey = ENTITY_ENABLED_KEY[entityType] as keyof typeof config
    if (enabledKey !== 'isEnabled' && !(config as unknown as Record<string, unknown>)[enabledKey]) {
      logger.info('Skipping disabled entity sync', { locationId, entityType })
      continue
    }

    const syncResult = await syncEntity(locationId, organizationId, entityType)
    results.push(syncResult)
  }

  return {
    locationId,
    locationName,
    results,
    totalDurationMs: Date.now() - start,
  }
}

export async function syncAllLocations(organizationId: string): Promise<LocationSyncResult[]> {
  const sb = await createSupabaseServerClient()
  const { data: configs } = await (sb as any).from('dutchie_config')
    .select('location_id, locations!inner(organization_id)')
    .eq('is_enabled', true)
    .eq('locations.organization_id', organizationId)

  if (!configs?.length) {
    logger.info('No enabled Dutchie configs found', { organizationId })
    return []
  }

  const results: LocationSyncResult[] = []

  // Sync org-wide entities once using the first location's API key
  const orgWideTypes = SYNC_ORDER.filter(t => ORG_WIDE_ENTITIES.has(t))
  const perLocationTypes = SYNC_ORDER.filter(t => !ORG_WIDE_ENTITIES.has(t))

  if (orgWideTypes.length > 0) {
    try {
      const orgResult = await syncLocation(configs[0].location_id, organizationId, orgWideTypes)
      results.push(orgResult)
    } catch (err) {
      logger.error('Org-wide sync failed', { error: String(err) })
    }
  }

  // Then sync per-location entities (rooms, inventory) for each location
  for (const config of configs) {
    try {
      const locationResult = await syncLocation(config.location_id, organizationId, perLocationTypes)
      results.push(locationResult)
    } catch (err) {
      logger.error('syncLocation failed', {
        locationId: config.location_id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  clearDutchieConfigCache()
  return results
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function filterValid<T extends object>(
  records: T[],
  requiredField: string,
  result: SyncResult,
): T[] {
  const valid: T[] = []
  for (const record of records) {
    const value = (record as Record<string, unknown>)[requiredField]
    if (value === undefined || value === null) {
      result.errored++
      result.errors.push(`Missing required field: ${requiredField}`)
      continue
    }
    valid.push(record)
  }
  return valid
}

function handleSyncError(err: unknown, result: SyncResult): void {
  const message = err instanceof Error ? err.message : String(err)
  result.errored++
  result.errors.push(message)
  logger.error('Sync error', { error: message })
}
