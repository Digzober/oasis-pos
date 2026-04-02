import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

function getJsonApiUrl(xmlUrl: string): string {
  return xmlUrl.replace('serverxml.asp', 'serverjson.asp')
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const locationId = request.nextUrl.searchParams.get('location_id') ?? session.locationId

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: btConfig } = await (sb as any).from('biotrack_config')
      .select('biotrack_location_id, xml_api_url, username_encrypted, password_encrypted, ubi')
      .eq('location_id', locationId)
      .maybeSingle()

    if (!btConfig?.xml_api_url || !btConfig?.username_encrypted || !btConfig?.password_encrypted) {
      return NextResponse.json({ error: 'BioTrack not configured for this location' }, { status: 400 })
    }
    if (!btConfig.biotrack_location_id) {
      return NextResponse.json({ error: 'BioTrack location ID not set. Configure it in Settings > BioTrack.' }, { status: 400 })
    }

    const apiUrl = getJsonApiUrl(btConfig.xml_api_url)
    const btLocationId = btConfig.biotrack_location_id

    // Login to v1 API
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
      return NextResponse.json({ error: `BioTrack auth failed: ${loginBody.error ?? 'Unknown'}` }, { status: 502 })
    }

    // Get all manifests for the org
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
      return NextResponse.json({ error: `BioTrack manifest sync failed: ${manifestBody.error ?? 'Unknown'}` }, { status: 502 })
    }

    // Get transfer items to find which manifests delivered TO this location
    const transferRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        API: '4.0',
        action: 'sync_inventory_transfer',
        sessionid: loginBody.sessionid,
        location: btLocationId,
      }),
      signal: AbortSignal.timeout(60000),
    })
    const transferBody = await transferRes.json()

    // Group transfer items by manifest ID — only items FROM this location
    // (outbound_license = this location means this location originated the transfer,
    // which in BioTrack means these items were received/exist at this location)
    const itemsByManifest = new Map<string, Array<{ inventoryid: string; strain: string | null; inventorytype: number; quantity: number; price: number }>>()
    const manifestIdsForLocation = new Set<string>()

    if (transferBody.success) {
      for (const t of (transferBody.inventory_transfer || [])) {
        if (t.outbound_license !== btLocationId) continue
        if (t.deleted === 1) continue
        const mid = t.manifestid
        manifestIdsForLocation.add(mid)
        if (!itemsByManifest.has(mid)) itemsByManifest.set(mid, [])
        itemsByManifest.get(mid)!.push({
          inventoryid: t.inventoryid,
          strain: t.strain,
          inventorytype: t.inventorytype,
          quantity: Number(t.quantity) || 0,
          price: Number(t.price) || 0,
        })
      }
    }

    // Build manifest lookup from sync_manifest
    const manifestMeta = new Map<string, any>()
    for (const m of (manifestBody.manifest || [])) {
      manifestMeta.set(m.manifestid, m)
    }

    // Resolve location names from our DB
    const allManifestData = [...manifestMeta.values()]
    const licenseNumbers = [...new Set(allManifestData.map((m: any) => m.origination_license_number).filter(Boolean))]
    const locationNames = new Map<string, string>()
    if (licenseNumbers.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: locs } = await (sb as any).from('biotrack_config')
        .select('biotrack_location_id, location_id, locations:location_id ( name )')
        .in('biotrack_location_id', licenseNumbers)
      for (const loc of locs ?? []) {
        const name = (loc.locations as any)?.name
        if (loc.biotrack_location_id && name) {
          locationNames.set(loc.biotrack_location_id, name)
        }
      }
    }

    // Inventory type labels
    const INVENTORY_TYPES: Record<number, string> = {
      1: 'Seed', 4: 'Dry Flower', 5: 'Shake/Trim', 6: 'Kief',
      13: 'Hash', 15: 'Rosin', 16: 'Tincture', 17: 'Capsule',
      21: 'Topical', 22: 'Edible', 23: 'Liquid Edible', 24: 'Concentrate',
      25: 'Vape Cart', 26: 'Wax', 27: 'Shatter', 28: 'Pre-Roll',
      29: 'Infused Pre-Roll', 30: 'Infused Non-Edible', 31: 'Flower',
      32: 'Infused Pre-Roll Multi',
    }

    // Build response: only manifests that have items for this location
    const manifests = [...manifestIdsForLocation]
      .map(mid => {
        const meta = manifestMeta.get(mid)
        const items = itemsByManifest.get(mid) || []
        const totalValue = items.reduce((s, it) => s + it.price, 0)
        const totalQty = items.reduce((s, it) => s + it.quantity, 0)
        return {
          manifestid: mid,
          sender_name: locationNames.get(meta?.origination_license_number) || meta?.origination_name || 'Unknown',
          sender_license: meta?.origination_license_number || '',
          sender_city: meta?.origination_city || '',
          transporter_name: meta?.transporter_name || '',
          transporter_vehicle: meta?.transporter_vehicle_details || '',
          total_item_count: items.length,
          total_quantity: totalQty,
          total_value: totalValue,
          fulfilled: meta?.fulfilled === 1 || meta?.fulfilled === '1',
          deleted: meta?.deleted === 1 || meta?.deleted === '1',
          date: meta?.sessiontime ? new Date(meta.sessiontime * 1000).toISOString() : '',
          items: items.map(it => ({
            ...it,
            inventory_type_name: INVENTORY_TYPES[it.inventorytype] || `Type ${it.inventorytype}`,
          })),
        }
      })
      .filter(m => !m.deleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      manifests,
      total_manifests: manifests.length,
      total_items: manifests.reduce((s, m) => s + m.total_item_count, 0),
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Receive history error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
