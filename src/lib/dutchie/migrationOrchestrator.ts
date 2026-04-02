import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { DutchieClient } from './client'
import type { DutchieProduct, DutchieCustomer } from './client'
import { mapDutchieProduct, extractLookupEntities } from './productMapper'
import { mapDutchieCustomer, extractCustomerGroups } from './customerMapper'

/**
 * Dutchie Migration Orchestrator
 *
 * Full data migration from Dutchie POS to our Supabase schema.
 * Idempotent — can re-run safely using dutchie_product_id / dutchie_customer_id as dedup keys.
 *
 * Migration order (FK dependencies):
 * 1. Rooms (independent, needed for inventory context)
 * 2. Lookup entities (brands, vendors, strains, categories, tags)
 * 3. Products (depends on lookups)
 * 4. Location product prices (depends on products)
 * 5. Product tags + images (depends on products)
 * 6. Employees (independent)
 * 7. Customers (independent)
 * 8. Customer group memberships (depends on customers + groups)
 *
 * Inventory comes from BioTrack, not Dutchie.
 */

export interface MigrationConfig {
  apiKey: string
  locationName: string
  organizationId: string
  locationId: string
  dryRun?: boolean
}

export interface MigrationResult {
  location: string
  products: { fetched: number; created: number; updated: number; errors: number }
  customers: { fetched: number; created: number; updated: number; skippedDupes: number; errors: number }
  lookups: {
    brands: number
    vendors: number
    strains: number
    categories: number
    tags: number
    customerGroups: number
  }
  rooms: { fetched: number; created: number }
  employees: { fetched: number; created: number; updated: number }
  locationPrices: { created: number; updated: number }
  productTags: { created: number }
  productImages: { created: number }
  duration: number
  errors: string[]
}

const BATCH_SIZE = 50

export async function runMigration(config: MigrationConfig): Promise<MigrationResult> {
  const start = Date.now()
  const errors: string[] = []
  const result: MigrationResult = {
    location: config.locationName,
    products: { fetched: 0, created: 0, updated: 0, errors: 0 },
    customers: { fetched: 0, created: 0, updated: 0, skippedDupes: 0, errors: 0 },
    lookups: { brands: 0, vendors: 0, strains: 0, categories: 0, tags: 0, customerGroups: 0 },
    rooms: { fetched: 0, created: 0 },
    employees: { fetched: 0, created: 0, updated: 0 },
    locationPrices: { created: 0, updated: 0 },
    productTags: { created: 0 },
    productImages: { created: 0 },
    duration: 0,
    errors: [],
  }

  const client = new DutchieClient({ apiKey: config.apiKey, locationName: config.locationName })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb: any = await createSupabaseServerClient()

  // Validate API key
  const whoami = await client.whoami()
  if (!whoami.valid) {
    errors.push('Invalid Dutchie API key')
    result.errors = errors
    result.duration = Date.now() - start
    return result
  }

  logger.info('Migration starting', {
    location: config.locationName,
    dutchieLocation: whoami.LocationName,
    dryRun: config.dryRun ?? false,
  })

  // ========================================
  // STEP 1: Fetch all data from Dutchie
  // ========================================
  const { data: dutchieProducts, error: prodErr } = await client.fetchProducts()
  if (prodErr) errors.push(`Products fetch: ${prodErr}`)
  result.products.fetched = dutchieProducts.length

  const { data: dutchieCustomers, error: custErr } = await client.fetchCustomers()
  if (custErr) errors.push(`Customers fetch: ${custErr}`)
  result.customers.fetched = dutchieCustomers.length

  const { data: dutchieRooms } = await client.fetchRooms()
  result.rooms.fetched = dutchieRooms.length

  const { data: dutchieEmployees } = await client.fetchEmployees()
  result.employees.fetched = dutchieEmployees.length

  const { data: dutchieOverrides } = await client.fetchLocationOverrides()

  if (config.dryRun) {
    logger.info('Dry run complete', {
      products: dutchieProducts.length,
      customers: dutchieCustomers.length,
      rooms: dutchieRooms.length,
      employees: dutchieEmployees.length,
      locationOverrides: dutchieOverrides.length,
    })
    result.duration = Date.now() - start
    result.errors = errors
    return result
  }

  // ========================================
  // STEP 2: Sync rooms
  // ========================================
  const roomMap = new Map<string, string>() // dutchie room name -> our room UUID
  try {
    const { data: existingRooms } = await sb.from('rooms')
      .select('id, name')
      .eq('location_id', config.locationId)

    for (const r of existingRooms ?? []) {
      roomMap.set(r.name, r.id)
    }

    for (const dr of dutchieRooms) {
      const name = dr.roomName
      if (!name || roomMap.has(name)) continue

      const { data: created } = await sb.from('rooms')
        .insert({
          organization_id: config.organizationId,
          location_id: config.locationId,
          name,
          room_types: ['sales_floor'],
          is_active: true,
        })
        .select('id')
        .single()

      if (created) {
        roomMap.set(name, created.id)
        result.rooms.created++
      }
    }
  } catch (err) {
    errors.push(`Rooms sync: ${String(err)}`)
  }

  // ========================================
  // STEP 3: Create/resolve lookup entities
  // ========================================
  const lookups = extractLookupEntities(dutchieProducts)
  const customerGroupNames = extractCustomerGroups(dutchieCustomers)

  const brandMap = await ensureLookupEntities(sb, 'brands', config.organizationId, lookups.brands)
  result.lookups.brands = brandMap.size

  const vendorMap = await ensureLookupEntities(sb, 'vendors', config.organizationId, lookups.vendors)
  result.lookups.vendors = vendorMap.size

  const strainMap = await ensureLookupEntities(sb, 'strains', config.organizationId, lookups.strains)
  result.lookups.strains = strainMap.size

  const categoryMap = await ensureCategoryEntities(sb, config.organizationId, lookups.categories)
  result.lookups.categories = categoryMap.size

  // Ensure a fallback "Uncategorized" category exists (category_id is NOT NULL)
  if (!categoryMap.has('Uncategorized')) {
    const { data: fallback } = await sb.from('product_categories')
      .select('id')
      .eq('organization_id', config.organizationId)
      .eq('name', 'Uncategorized')
      .maybeSingle()

    if (fallback) {
      categoryMap.set('Uncategorized', fallback.id)
    } else {
      const { data: created } = await sb.from('product_categories')
        .insert({ organization_id: config.organizationId, name: 'Uncategorized' })
        .select('id')
        .single()
      if (created) categoryMap.set('Uncategorized', created.id)
    }
  }
  const fallbackCategoryId = categoryMap.get('Uncategorized')!

  // Ensure tags exist and get tag map
  const tagMap = await ensureTagEntities(sb, config.organizationId, lookups.tags)
  result.lookups.tags = tagMap.size

  const customerGroupMap = await ensureCustomerGroups(sb, config.organizationId, customerGroupNames)
  result.lookups.customerGroups = customerGroupMap.size

  // ========================================
  // STEP 4: Migrate products + tags + images
  // ========================================
  // Build dutchie productId -> our product UUID map for location prices
  const productIdMap = new Map<number, string>()

  for (let i = 0; i < dutchieProducts.length; i += BATCH_SIZE) {
    const batch = dutchieProducts.slice(i, i + BATCH_SIZE)

    for (const dp of batch) {
      try {
        const mapped = mapDutchieProduct(dp)
        const brandId = dp.brandName ? brandMap.get(dp.brandName.trim()) ?? null : null
        const vendorId = dp.vendorName ? vendorMap.get(dp.vendorName.trim()) ?? null : null
        const strainId = dp.strain ? strainMap.get(dp.strain.trim()) ?? null : null
        const categoryId = (dp.category ? categoryMap.get(dp.category.trim()) : null)
          ?? (dp.masterCategory ? categoryMap.get(dp.masterCategory.trim()) : null)
          ?? fallbackCategoryId

        // Check if already migrated
        const { data: existing } = await sb.from('products')
          .select('id')
          .eq('dutchie_product_id', dp.productId)
          .eq('organization_id', config.organizationId)
          .maybeSingle()

        const record = {
          organization_id: config.organizationId,
          brand_id: brandId,
          vendor_id: vendorId,
          strain_id: strainId,
          category_id: categoryId,
          ...mapped,
        }

        let productUuid: string

        if (existing) {
          await sb.from('products').update(record).eq('id', existing.id)
          productUuid = existing.id
          result.products.updated++
        } else {
          const { data: newProd } = await sb.from('products')
            .insert(record)
            .select('id')
            .single()
          productUuid = newProd?.id
          result.products.created++
        }

        if (productUuid) {
          productIdMap.set(dp.productId, productUuid)

          // Sync product tags
          await syncProductTags(sb, productUuid, dp, tagMap, result)

          // Sync product images
          await syncProductImages(sb, productUuid, dp, result)
        }
      } catch (err) {
        result.products.errors++
        errors.push(`Product ${dp.productId} (${dp.productName}): ${String(err)}`)
      }
    }
  }

  // ========================================
  // STEP 5: Create location_product_prices
  // ========================================
  // Build override map: dutchie productId -> override data
  const overrideMap = new Map<number, typeof dutchieOverrides[0]>()
  for (const o of dutchieOverrides) {
    if (o.productId) overrideMap.set(o.productId, o)
  }

  for (const dp of dutchieProducts) {
    const productUuid = productIdMap.get(dp.productId)
    if (!productUuid) continue

    try {
      const override = overrideMap.get(dp.productId)

      const priceRecord = {
        product_id: productUuid,
        location_id: config.locationId,
        rec_price: override?.recPrice ?? dp.recPrice ?? dp.price ?? null,
        med_price: override?.medPrice ?? dp.medPrice ?? dp.price ?? null,
        is_active: override?.isActive ?? dp.isActive ?? true,
        available_on_pos: override?.availableOnPos ?? dp.posProducts ?? true,
        available_online: override?.availableOnline ?? dp.onlineAvailable ?? false,
      }

      // Check if exists
      const { data: existingPrice } = await sb.from('location_product_prices')
        .select('id')
        .eq('product_id', productUuid)
        .eq('location_id', config.locationId)
        .maybeSingle()

      if (existingPrice) {
        await sb.from('location_product_prices').update(priceRecord).eq('id', existingPrice.id)
        result.locationPrices.updated++
      } else {
        await sb.from('location_product_prices').insert(priceRecord)
        result.locationPrices.created++
      }
    } catch (err) {
      errors.push(`Location price for product ${dp.productId}: ${String(err)}`)
    }
  }

  // ========================================
  // STEP 6: Sync employees
  // ========================================
  for (const de of dutchieEmployees) {
    try {
      if (!de.firstName && !de.lastName) continue

      const { data: existingEmp } = await sb.from('employees')
        .select('id')
        .eq('organization_id', config.organizationId)
        .ilike('first_name', de.firstName || '')
        .ilike('last_name', de.lastName || '')
        .maybeSingle()

      const empRecord = {
        organization_id: config.organizationId,
        first_name: de.firstName || 'Unknown',
        last_name: de.lastName || '',
        role: mapEmployeeRole(de.role),
        is_active: de.isActive ?? true,
      }

      if (existingEmp) {
        await sb.from('employees').update(empRecord).eq('id', existingEmp.id)
        result.employees.updated++
      } else {
        const { data: newEmp } = await sb.from('employees')
          .insert({ ...empRecord, pin_hash: '0000' }) // placeholder PIN
          .select('id')
          .single()

        // Assign to this location
        if (newEmp) {
          await sb.from('employee_locations')
            .upsert({
              employee_id: newEmp.id,
              location_id: config.locationId,
            }, { onConflict: 'employee_id,location_id' })
            .then(() => {})
        }
        result.employees.created++
      }
    } catch (err) {
      errors.push(`Employee ${de.firstName} ${de.lastName}: ${String(err)}`)
    }
  }

  // ========================================
  // STEP 7: Migrate customers (with dedup)
  // ========================================
  for (let i = 0; i < dutchieCustomers.length; i += BATCH_SIZE) {
    const batch = dutchieCustomers.slice(i, i + BATCH_SIZE)

    for (const dc of batch) {
      try {
        const mapped = mapDutchieCustomer(dc)

        // Check if already migrated by dutchie_customer_id
        const { data: existing } = await sb.from('customers')
          .select('id')
          .eq('dutchie_customer_id', dc.customerId)
          .eq('organization_id', config.organizationId)
          .maybeSingle()

        // Email dedup — use limit(1) to handle dirty data with multiple matches
        let emailDupe = false
        if (!existing && dc.emailAddress) {
          const { data: byEmail } = await sb.from('customers')
            .select('id')
            .eq('organization_id', config.organizationId)
            .eq('email', dc.emailAddress)
            .limit(1)

          const firstMatch = byEmail?.[0]
          if (firstMatch) {
            emailDupe = true
            await sb.from('customers')
              .update({ dutchie_customer_id: dc.customerId })
              .eq('id', firstMatch.id)
          }
        }

        if (emailDupe) {
          result.customers.skippedDupes++
          continue
        }

        const record = {
          organization_id: config.organizationId,
          ...mapped,
        }

        if (existing) {
          await sb.from('customers').update(record).eq('id', existing.id)
          result.customers.updated++
        } else {
          const { data: newCust } = await sb.from('customers')
            .insert(record)
            .select('id')
            .single()

          // Create group memberships
          if (newCust && dc.discountGroups) {
            for (const groupName of dc.discountGroups) {
              const groupId = customerGroupMap.get(groupName.trim())
              if (groupId) {
                await sb.from('customer_group_members')
                  .upsert(
                    { customer_id: newCust.id, customer_group_id: groupId },
                    { onConflict: 'customer_id,customer_group_id' },
                  )
                  .then(() => {})
              }
            }
          }

          result.customers.created++
        }
      } catch (err) {
        result.customers.errors++
        errors.push(`Customer ${dc.customerId} (${dc.firstName} ${dc.lastName}): ${String(err)}`)
      }
    }
  }

  // Log full errors before truncating
  if (errors.length > 100) {
    logger.error('Migration had more than 100 errors — truncating for DB storage', {
      location: config.locationName,
      totalErrors: errors.length,
      fullErrors: errors,
    })
  }

  result.errors = errors.slice(0, 100)
  result.duration = Date.now() - start

  logger.info('Migration complete', {
    location: config.locationName,
    products: result.products,
    customers: result.customers,
    rooms: result.rooms,
    employees: result.employees,
    locationPrices: result.locationPrices,
    productTags: result.productTags,
    productImages: result.productImages,
    duration: `${(result.duration / 1000).toFixed(1)}s`,
    errorCount: errors.length,
  })

  return result
}

// =====================
// Product tags sync
// =====================

async function syncProductTags(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  productUuid: string,
  dp: DutchieProduct,
  tagMap: Map<string, string>,
  result: MigrationResult,
) {
  if (!dp.tags || dp.tags.length === 0) return

  for (const tagName of dp.tags) {
    const tagId = tagMap.get(tagName.trim())
    if (!tagId) continue

    const { error } = await sb.from('product_tags')
      .upsert(
        { product_id: productUuid, tag_id: tagId },
        { onConflict: 'product_id,tag_id' },
      )

    if (!error) result.productTags.created++
  }
}

// =====================
// Product images sync
// =====================

async function syncProductImages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  productUuid: string,
  dp: DutchieProduct,
  result: MigrationResult,
) {
  const urls: string[] = []
  if (dp.imageUrl) urls.push(dp.imageUrl)
  if (dp.imageUrls) {
    for (const u of dp.imageUrls) {
      if (u && !urls.includes(u)) urls.push(u)
    }
  }
  if (urls.length === 0) return

  // Check existing images to avoid dupes
  const { data: existingImages } = await sb.from('product_images')
    .select('image_url')
    .eq('product_id', productUuid)

  const existingUrls = new Set((existingImages ?? []).map((i: { image_url: string }) => i.image_url))

  for (let i = 0; i < urls.length; i++) {
    if (existingUrls.has(urls[i])) continue

    const { error } = await sb.from('product_images')
      .insert({
        product_id: productUuid,
        image_url: urls[i],
        sort_order: i,
        is_primary: i === 0,
      })

    if (!error) result.productImages.created++
  }
}

// =====================
// Employee role mapping
// =====================

/**
 * Maps Dutchie role to our CHECK constraint: 'budtender' | 'shift_lead' | 'manager' | 'admin' | 'owner'
 */
function mapEmployeeRole(dutchieRole: string | null): 'budtender' | 'shift_lead' | 'manager' | 'admin' | 'owner' {
  if (!dutchieRole) return 'budtender'
  const lower = dutchieRole.toLowerCase()
  if (lower.includes('owner')) return 'owner'
  if (lower.includes('admin')) return 'admin'
  if (lower.includes('manager')) return 'manager'
  if (lower.includes('lead') || lower.includes('supervisor')) return 'shift_lead'
  return 'budtender'
}

// =====================
// Tag entity helper
// =====================

/**
 * Batch-inserts product tags.
 */
async function ensureTagEntities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  organizationId: string,
  names: Set<string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (names.size === 0) return map

  const { data: existing } = await sb.from('tags')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('tag_type', 'product')

  for (const row of existing ?? []) {
    map.set(row.name, row.id)
  }

  const missing = [...names].filter(n => !map.has(n))
  if (missing.length > 0) {
    const CHUNK = 100
    for (let i = 0; i < missing.length; i += CHUNK) {
      const batch = missing.slice(i, i + CHUNK).map(name => ({
        organization_id: organizationId,
        name,
        tag_type: 'product',
      }))
      const { data: created } = await sb.from('tags')
        .insert(batch)
        .select('id, name')

      for (const row of created ?? []) {
        map.set(row.name, row.id)
      }
    }
  }

  return map
}

// =====================
// Lookup entity helpers
// =====================

/**
 * Batch-inserts lookup entities (brands, vendors, strains).
 * Inserts missing names in batches of 100 instead of one-by-one.
 */
async function ensureLookupEntities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  table: 'brands' | 'vendors' | 'strains',
  organizationId: string,
  names: Set<string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (names.size === 0) return map

  const { data: existing } = await sb
    .from(table)
    .select('id, name')
    .eq('organization_id', organizationId)

  for (const row of existing ?? []) {
    map.set(row.name, row.id)
  }

  const missing = [...names].filter(n => !map.has(n))
  if (missing.length > 0) {
    const CHUNK = 100
    for (let i = 0; i < missing.length; i += CHUNK) {
      const batch = missing.slice(i, i + CHUNK).map(name => ({
        organization_id: organizationId,
        name,
      }))
      const { data: created } = await sb
        .from(table)
        .upsert(batch, { onConflict: 'organization_id,name', ignoreDuplicates: true })
        .select('id, name')

      for (const row of created ?? []) {
        map.set(row.name, row.id)
      }
    }
  }

  return map
}

/**
 * Batch-inserts product categories.
 */
async function ensureCategoryEntities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  organizationId: string,
  names: Set<string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (names.size === 0) return map

  const { data: existing } = await sb
    .from('product_categories')
    .select('id, name')
    .eq('organization_id', organizationId)

  for (const row of existing ?? []) {
    map.set(row.name, row.id)
  }

  const missing = [...names].filter(n => !map.has(n))
  if (missing.length > 0) {
    // Categories don't have a unique constraint on name, insert one by one to avoid dupes
    for (const name of missing) {
      const { data: created } = await sb
        .from('product_categories')
        .insert({ organization_id: organizationId, name })
        .select('id')
        .single()

      if (created) map.set(name, created.id)
    }
  }

  return map
}

/**
 * Batch-inserts customer groups.
 */
async function ensureCustomerGroups(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  organizationId: string,
  names: Set<string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (names.size === 0) return map

  const { data: existing } = await sb
    .from('customer_groups')
    .select('id, name')
    .eq('organization_id', organizationId)

  for (const row of existing ?? []) {
    map.set(row.name, row.id)
  }

  const missing = [...names].filter(n => !map.has(n))
  if (missing.length > 0) {
    const CHUNK = 100
    for (let i = 0; i < missing.length; i += CHUNK) {
      const batch = missing.slice(i, i + CHUNK).map(name => ({
        organization_id: organizationId,
        name,
      }))
      const { data: created } = await sb
        .from('customer_groups')
        .insert(batch)
        .select('id, name')

      for (const row of created ?? []) {
        map.set(row.name, row.id)
      }
    }
  }

  return map
}
