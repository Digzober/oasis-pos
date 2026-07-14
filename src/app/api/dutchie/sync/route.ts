import { NextRequest, NextResponse } from 'next/server'
import { requireDutchieManager } from '@/lib/auth/dutchie'
import { loadDutchieConfig } from '@/lib/dutchie/configLoader'
import { DutchieClient } from '@/lib/dutchie/client'
import { syncLocation } from '@/lib/dutchie/syncEngine'
import { logger } from '@/lib/utils/logger'
import type { EntityType } from '@/lib/dutchie/types'

/**
 * POST /api/dutchie/sync
 * Triggers a live sync from Dutchie for the session's location.
 *
 * Body:
 * - entityTypes?: string[] — which entity types to sync (default: all enabled)
 *
 * Delegates to syncEngine which handles fetch, mapping, upsert, and logging.
 */

const VALID_ENTITY_TYPES: EntityType[] = ['employees', 'customers', 'products', 'inventory', 'rooms', 'transactions', 'loyalty']

export async function POST(request: NextRequest) {
  try {
    const session = await requireDutchieManager()
    const body = await request.json().catch(() => ({}))

    // Load config
    const config = await loadDutchieConfig(session.locationId, session.organizationId)
    if (!config) {
      return NextResponse.json({ error: 'No Dutchie configuration found for this location' }, { status: 404 })
    }
    if (!config.apiKey) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 400 })
    }

    // Validate connection
    const client = new DutchieClient(config.apiKey)
    const whoami = await client.whoami()
    logger.info('Dutchie whoami result', {
      locationName: whoami.locationName,
      locationId: whoami.locationId,
      companyName: whoami.companyName,
      valid: whoami.valid,
      oasisLocationId: session.locationId,
    })
    if (!whoami.valid) {
      return NextResponse.json({ error: 'Invalid API key or connection failed' }, { status: 400 })
    }

    // Determine which entity types to sync
    let entityTypes: EntityType[] | undefined
    if (body.entityTypes && Array.isArray(body.entityTypes)) {
      entityTypes = body.entityTypes.filter((t: string) =>
        VALID_ENTITY_TYPES.includes(t as EntityType),
      ) as EntityType[]
      if (entityTypes.length === 0) {
        return NextResponse.json({ error: 'No valid entity types specified' }, { status: 400 })
      }
    }

    // Delegate to sync engine — handles fetch, mapping, upsert, soft-delete, and logging
    const locationResult = await syncLocation(session.locationId, session.organizationId, entityTypes)

    const results = locationResult.results.map(r => ({
      entityType: r.entityType,
      fetched: r.fetched,
      created: r.created,
      updated: r.updated,
      skipped: r.skipped,
      errors: r.errored,
      duration: r.durationMs,
    }))

    const allErrors = locationResult.results.flatMap(r => r.errors)

    logger.info('Dutchie sync complete', {
      locationId: session.locationId,
      entityTypes: locationResult.results.map(r => r.entityType),
      duration: locationResult.totalDurationMs,
      errorCount: allErrors.length,
    })

    return NextResponse.json({ results, errors: allErrors.slice(0, 50) })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message?: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED' || a.code === 'FORBIDDEN') {
        return NextResponse.json({ error: a.message ?? 'Access denied' }, { status: a.statusCode ?? 403 })
      }
      if (a.code === 'SYNC_ALREADY_RUNNING') {
        return NextResponse.json({ error: a.message ?? 'Sync already running' }, { status: 409 })
      }
    }
    logger.error('Dutchie sync error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
