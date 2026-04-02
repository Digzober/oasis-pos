import { NextResponse } from 'next/server'
import { runMigration } from '@/lib/dutchie/migrationOrchestrator'
import { DutchieClient } from '@/lib/dutchie/client'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/migration/dutchie
 * Triggers a Dutchie data migration for a specific location.
 *
 * Body: {
 *   apiKey: string,          // Dutchie API key for this location
 *   organizationId: string,  // Our org UUID
 *   locationId: string,      // Our location UUID
 *   locationName: string,    // Human-readable location name (for logging)
 *   dryRun?: boolean         // If true, fetch only, don't write to DB
 * }
 *
 * This endpoint is meant to be called manually during cutover, not automated.
 * It's idempotent: re-running for the same location will update existing records
 * rather than creating duplicates (keyed on dutchie_product_id / dutchie_customer_id).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { apiKey, organizationId, locationId, locationName, dryRun } = body

    if (!apiKey || !organizationId || !locationId || !locationName) {
      return NextResponse.json(
        { error: 'apiKey, organizationId, locationId, and locationName are required' },
        { status: 400 },
      )
    }

    logger.info('Dutchie migration requested', { locationName, dryRun: dryRun ?? false })

    const result = await runMigration({
      apiKey,
      organizationId,
      locationId,
      locationName,
      dryRun: dryRun ?? false,
    })

    const status = result.errors.length > 0 ? 207 : 200

    return NextResponse.json({ result }, { status })
  } catch (err) {
    logger.error('Dutchie migration failed', { error: String(err) })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * GET /api/migration/dutchie?apiKey=xxx
 * Validates a Dutchie API key and returns location info.
 * Use this before triggering a full migration to confirm the key works.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const apiKey = searchParams.get('apiKey')

  if (!apiKey) {
    return NextResponse.json({ error: 'apiKey query parameter is required' }, { status: 400 })
  }

  try {
    const client = new DutchieClient({ apiKey, locationName: 'validation' })
    const whoami = await client.whoami()

    if (!whoami.valid) {
      return NextResponse.json({ valid: false, error: 'Invalid API key' }, { status: 401 })
    }

    return NextResponse.json({
      valid: true,
      dutchieLocationId: whoami.locationId,
      dutchieLocationName: whoami.locationName,
      organizationName: whoami.organizationName,
    })
  } catch (err) {
    return NextResponse.json({ valid: false, error: String(err) }, { status: 500 })
  }
}
