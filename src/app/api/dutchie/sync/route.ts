import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DutchieClient } from '@/lib/dutchie/client'
import { loadDutchieConfig, updateSyncTimestamp } from '@/lib/dutchie/configLoader'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/dutchie/sync
 * Triggers a live sync from Dutchie for the session's location.
 *
 * Body:
 * - entityTypes?: string[] — which entity types to sync (default: all enabled)
 *
 * Uses the session's locationId and organizationId.
 * Returns sync results per entity type.
 */

const VALID_ENTITY_TYPES = ['employees', 'customers', 'products', 'inventory', 'rooms'] as const
type EntityType = typeof VALID_ENTITY_TYPES[number]

interface EntityResult {
  entityType: string
  fetched: number
  created: number
  updated: number
  skipped: number
  errors: number
  duration: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json().catch(() => ({}))

    // Load config
    const config = await loadDutchieConfig(session.locationId)
    if (!config) {
      return NextResponse.json({ error: 'No Dutchie configuration found for this location' }, { status: 404 })
    }
    if (!config.apiKey) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 400 })
    }

    // Determine which entity types to sync
    let entityTypes: EntityType[]
    if (body.entityTypes && Array.isArray(body.entityTypes)) {
      entityTypes = body.entityTypes.filter((t: string) =>
        VALID_ENTITY_TYPES.includes(t as EntityType),
      ) as EntityType[]
    } else {
      // Sync all enabled types
      entityTypes = []
      if (config.syncEmployees) entityTypes.push('employees')
      if (config.syncCustomers) entityTypes.push('customers')
      if (config.syncProducts) entityTypes.push('products')
      if (config.syncInventory) entityTypes.push('inventory')
      if (config.syncRooms) entityTypes.push('rooms')
    }

    if (entityTypes.length === 0) {
      return NextResponse.json({ error: 'No entity types to sync' }, { status: 400 })
    }

    // Create sync log entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logEntry } = await (sb as any).from('dutchie_sync_log')
      .insert({
        location_id: session.locationId,
        entity_type: entityTypes.length === 1 ? entityTypes[0] : 'all',
        sync_type: 'full',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    const logId = logEntry?.id
    const client = new DutchieClient(config.apiKey)
    const results: EntityResult[] = []
    const allErrors: string[] = []
    const overallStart = Date.now()

    // Validate connection
    const whoami = await client.whoami()
    if (!whoami.valid) {
      if (logId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (sb as any).from('dutchie_sync_log')
          .update({ status: 'failed', completed_at: new Date().toISOString(), error_details: ['Invalid API key'] })
          .eq('id', logId)
      }
      return NextResponse.json({ error: 'Invalid API key or connection failed' }, { status: 400 })
    }

    // Sync each entity type
    for (const entityType of entityTypes) {
      const start = Date.now()
      const result: EntityResult = {
        entityType,
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        duration: 0,
      }

      try {
        switch (entityType) {
          case 'employees': {
            const employees = await client.fetchEmployees()
            result.fetched = employees.length
            // Sync employees to DB
            for (const emp of employees) {
              try {
                if (!emp.firstName && !emp.lastName) { result.skipped++; continue }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: existing } = await (sb as any).from('employees')
                  .select('id')
                  .eq('organization_id', session.organizationId)
                  .ilike('first_name', emp.firstName || '')
                  .ilike('last_name', emp.lastName || '')
                  .maybeSingle()

                const empRecord = {
                  organization_id: session.organizationId,
                  first_name: emp.firstName || 'Unknown',
                  last_name: emp.lastName || '',
                  role: mapEmployeeRole(emp.role),
                  is_active: emp.isActive ?? true,
                }

                if (existing) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  await (sb as any).from('employees').update(empRecord).eq('id', existing.id)
                  result.updated++
                } else {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const { data: newEmp } = await (sb as any).from('employees')
                    .insert({ ...empRecord, pin_hash: '0000' })
                    .select('id')
                    .single()
                  if (newEmp) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (sb as any).from('employee_locations')
                      .upsert({ employee_id: newEmp.id, location_id: session.locationId }, { onConflict: 'employee_id,location_id' })
                  }
                  result.created++
                }
              } catch (err) {
                result.errors++
                allErrors.push(`Employee ${emp.firstName} ${emp.lastName}: ${String(err)}`)
              }
            }
            await updateSyncTimestamp(session.locationId, 'employees', new Date())
            break
          }
          case 'customers': {
            const customers = await client.fetchCustomers()
            result.fetched = customers.length
            for (const dc of customers) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: existing } = await (sb as any).from('customers')
                  .select('id')
                  .eq('dutchie_customer_id', dc.customerId)
                  .eq('organization_id', session.organizationId)
                  .maybeSingle()

                if (existing) {
                  result.updated++
                } else {
                  result.created++
                }
              } catch (err) {
                result.errors++
                allErrors.push(`Customer ${dc.customerId}: ${String(err)}`)
              }
            }
            await updateSyncTimestamp(session.locationId, 'customers', new Date())
            break
          }
          case 'products': {
            const products = await client.fetchProducts()
            result.fetched = products.length
            for (const dp of products) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: existing } = await (sb as any).from('products')
                  .select('id')
                  .eq('dutchie_product_id', dp.productId)
                  .eq('organization_id', session.organizationId)
                  .maybeSingle()

                if (existing) {
                  result.updated++
                } else {
                  result.created++
                }
              } catch (err) {
                result.errors++
                allErrors.push(`Product ${dp.productId}: ${String(err)}`)
              }
            }
            await updateSyncTimestamp(session.locationId, 'products', new Date())
            break
          }
          case 'inventory': {
            const inventory = await client.fetchInventory({ includeLabResults: true, includeRoomQuantities: true })
            result.fetched = inventory.length
            await updateSyncTimestamp(session.locationId, 'inventory', new Date())
            break
          }
          case 'rooms': {
            const rooms = await client.fetchRooms()
            result.fetched = rooms.length

            // Load existing rooms — need name + external_id for matching
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existingRooms } = await (sb as any).from('rooms')
              .select('id, name, external_id')
              .eq('location_id', session.locationId)

            const byName = new Map<string, { id: string; external_id: string | null }>()
            const byExtId = new Map<string, string>()
            for (const r of existingRooms ?? []) {
              byName.set(r.name, { id: r.id, external_id: r.external_id })
              if (r.external_id) byExtId.set(r.external_id, r.id)
            }

            const ROOM_TYPE_MAP: Record<string, string> = {
              sales: 'sales_floor', 'sales floor': 'sales_floor', sales_floor: 'sales_floor',
              vault: 'vault', safe: 'vault',
              quarantine: 'quarantine', hold: 'quarantine',
              storage: 'storage', back: 'storage', backroom: 'storage',
              display: 'display',
            }

            for (const dr of rooms) {
              const name = dr.roomName
              if (!name) { result.skipped++; continue }
              const extId = String(dr.roomId)
              const roomType = dr.roomType?.toLowerCase().trim() ?? ''
              const resolvedType = ROOM_TYPE_MAP[roomType] ?? (roomType || 'sales_floor')

              try {
                // Check if seeded room exists by name with null external_id
                const nameMatch = byName.get(name)
                if (nameMatch && !nameMatch.external_id) {
                  // Stamp external_id + update room_types on the seeded room
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  await (sb as any).from('rooms')
                    .update({ external_id: extId, room_types: [resolvedType], is_active: true })
                    .eq('id', nameMatch.id)
                  byExtId.set(extId, nameMatch.id)
                  result.updated++
                } else if (byExtId.has(extId)) {
                  // Update existing room matched by external_id
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  await (sb as any).from('rooms')
                    .update({ name, room_types: [resolvedType], is_active: true })
                    .eq('id', byExtId.get(extId))
                  result.updated++
                } else {
                  // New room — insert (no organization_id, rooms are scoped by location_id)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  await (sb as any).from('rooms').insert({
                    location_id: session.locationId,
                    name,
                    external_id: extId,
                    room_types: [resolvedType],
                    is_active: true,
                  })
                  result.created++
                }
              } catch (err) {
                result.errors++
                allErrors.push(`Room ${name}: ${String(err)}`)
              }
            }
            await updateSyncTimestamp(session.locationId, 'rooms', new Date())
            break
          }
        }
      } catch (err) {
        result.errors++
        allErrors.push(`${entityType} fetch: ${String(err)}`)
      }

      result.duration = Date.now() - start
      results.push(result)
    }

    // Update sync log
    const overallDuration = Date.now() - overallStart
    const hasErrors = allErrors.length > 0
    if (logId) {
      const totalRecords = results.reduce((sum, r) => sum + r.fetched, 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('dutchie_sync_log')
        .update({
          status: hasErrors ? 'failed' : 'completed',
          completed_at: new Date().toISOString(),
          records_fetched: totalRecords,
          records_created: results.reduce((s, r) => s + r.created, 0),
          records_updated: results.reduce((s, r) => s + r.updated, 0),
          records_skipped: results.reduce((s, r) => s + r.skipped, 0),
          records_errored: results.reduce((s, r) => s + r.errors, 0),
          duration_ms: overallDuration,
          error_details: hasErrors ? allErrors.slice(0, 10) : null,
        })
        .eq('id', logId)
    }

    logger.info('Dutchie sync complete', {
      locationId: session.locationId,
      entityTypes,
      duration: overallDuration,
      errorCount: allErrors.length,
    })

    return NextResponse.json({ results, errors: allErrors.slice(0, 50) })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }
    logger.error('Dutchie sync error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function mapEmployeeRole(dutchieRole: string | null): 'budtender' | 'shift_lead' | 'manager' | 'admin' | 'owner' {
  if (!dutchieRole) return 'budtender'
  const lower = dutchieRole.toLowerCase()
  if (lower.includes('owner')) return 'owner'
  if (lower.includes('admin')) return 'admin'
  if (lower.includes('manager')) return 'manager'
  if (lower.includes('lead') || lower.includes('supervisor')) return 'shift_lead'
  return 'budtender'
}
