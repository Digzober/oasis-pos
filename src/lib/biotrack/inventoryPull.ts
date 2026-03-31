import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getBioTrackClient } from './client'
import { logger } from '@/lib/utils/logger'

export async function pullBioTrackInventory(locationId: string): Promise<void> {
  const sb = await createSupabaseServerClient()

  const { data: location } = await sb.from('locations').select('organization_id, biotrack_location_id').eq('id', locationId).single()
  if (!location?.biotrack_location_id) {
    logger.warn('No BioTrack location ID for inventory pull', { locationId })
    return
  }

  try {
    const client = getBioTrackClient()
    const response = await client.call('inventory/sync', {
      location_id: location.biotrack_location_id,
    }, {
      organizationId: location.organization_id,
      locationId,
      entityType: 'inventory_sync',
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const btItems = (response.data as any)?.inventory ?? []
    logger.info('BioTrack inventory pulled', { locationId, itemCount: btItems.length })

    // We don't update local quantities from BioTrack (our system is source of truth for local)
    // This pull is cached for reconciliation comparison
  } catch (err) {
    logger.error('BioTrack inventory pull failed', { locationId, error: String(err) })
  }
}

export async function pullAllLocations(): Promise<number> {
  const sb = await createSupabaseServerClient()
  const { data: locations } = await sb.from('locations').select('id').eq('is_active', true)

  let count = 0
  for (const loc of locations ?? []) {
    await pullBioTrackInventory(loc.id)
    count++
  }
  return count
}
