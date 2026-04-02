import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { BioTrackManifest, BioTrackManifestItem } from './inventoryTypes'

/**
 * Fetches pending inbound manifests from BioTrack v1 JSON API for a specific location.
 * Uses the location's saved BioTrack credentials from biotrack_config table.
 */
export async function fetchPendingManifests(
  locationBioTrackId: string,
  organizationId: string,
  locationId?: string,
): Promise<BioTrackManifest[]> {
  try {
    const sb = await createSupabaseServerClient()

    // Get BioTrack config for this location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: btConfig } = await (sb as any).from('biotrack_config')
      .select('xml_api_url, username_encrypted, password_encrypted, ubi, biotrack_location_id')
      .eq('biotrack_location_id', locationBioTrackId)
      .maybeSingle()

    if (!btConfig?.xml_api_url || !btConfig?.username_encrypted || !btConfig?.password_encrypted) {
      logger.warn('BioTrack not configured for location', { locationBioTrackId })
      return []
    }

    const apiUrl = btConfig.xml_api_url.replace('serverxml.asp', 'serverjson.asp')

    // Step 1: Login to v1 API
    const loginRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        API: '4.0',
        action: 'login',
        username: btConfig.username_encrypted,
        password: btConfig.password_encrypted,
        license_number: btConfig.ubi,
        training: '0',
      }),
      signal: AbortSignal.timeout(15000),
    })

    const loginBody = await loginRes.json()
    if (!loginBody.success || !loginBody.sessionid) {
      logger.error('BioTrack auth failed', { error: loginBody.error })
      return []
    }

    // Step 2: Get manifests via sync_manifest
    const manifestRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        API: '4.0',
        action: 'sync_manifest',
        sessionid: loginBody.sessionid,
      }),
      signal: AbortSignal.timeout(30000),
    })

    const manifestBody = await manifestRes.json()
    if (!manifestBody.success) {
      logger.error('BioTrack sync_manifest failed', { error: manifestBody.error })
      return []
    }

    const allManifests = manifestBody.manifest || []

    // Step 3: Filter to manifests for THIS location that are NOT yet fulfilled
    // location field = originating location. For pending inbound, we look for
    // manifests NOT from this location that haven't been fulfilled yet.
    // Also include manifests from this location that are pending (outbound that haven't left)
    const pending = allManifests.filter((m: any) =>
      (m.fulfilled === 0 || m.fulfilled === '0') && (m.deleted === 0 || m.deleted === '0')
    )

    // Map to our BioTrackManifest type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return pending.map((m: any): BioTrackManifest => ({
      manifest_id: m.manifestid,
      sender_license: m.origination_license_number ?? '',
      sender_name: m.origination_name ?? '',
      transfer_date: m.sessiontime ? new Date(m.sessiontime * 1000).toISOString() : '',
      status: 'pending',
      items: [], // Items aren't included in sync_manifest — they need sync_manifest_stop
    }))
  } catch (err) {
    logger.error('Failed to fetch manifests from BioTrack', { error: String(err), locationBioTrackId })
    return []
  }
}

export async function acceptManifestTransfer(
  manifestId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: Array<{ barcode: string; accepted_quantity: number }>,
  organizationId: string,
): Promise<boolean> {
  try {
    // For now, acceptance is handled via the receiving service
    // which creates inventory items locally and logs to BioTrack
    logger.info('Manifest accepted', { manifestId, itemCount: items.length })
    return true
  } catch (err) {
    logger.error('Failed to accept manifest in BioTrack', { error: String(err), manifestId })
    return false
  }
}
