import { getBioTrackClient } from './client'
import { logger } from '@/lib/utils/logger'
import type { BioTrackManifest, BioTrackManifestItem } from './inventoryTypes'

export async function fetchPendingManifests(
  locationBioTrackId: string,
  organizationId: string,
): Promise<BioTrackManifest[]> {
  const client = getBioTrackClient()

  try {
    const response = await client.call('inventory/manifests/pending', {
      location_id: locationBioTrackId,
    }, {
      organizationId,
      entityType: 'manifest',
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manifests = (response.data as any)?.manifests ?? []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return manifests.map((m: any): BioTrackManifest => ({
      manifest_id: m.manifest_id ?? m.id,
      sender_license: m.sender_license ?? m.from_license ?? '',
      sender_name: m.sender_name ?? m.from_name ?? '',
      transfer_date: m.transfer_date ?? m.created_at ?? '',
      status: m.status ?? 'pending',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (m.items ?? []).map((item: any): BioTrackManifestItem => ({
        barcode: item.barcode ?? item.id ?? '',
        product_name: item.product_name ?? item.productname ?? item.strain ?? '',
        quantity: item.quantity ?? item.remaining_quantity ?? 0,
        weight: item.weight ?? item.remaining_weight ?? 0,
        category: item.category ?? item.inventorytype ?? '',
        batch_number: item.batch_number ?? item.sessiontime ?? '',
        lab_results: item.lab_results ?? null,
        thc_percentage: item.thc ?? item.thc_percentage ?? null,
        cbd_percentage: item.cbd ?? item.cbd_percentage ?? null,
      })),
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
  const client = getBioTrackClient()

  try {
    await client.call('inventory/manifests/accept', {
      manifest_id: manifestId,
      items: items.map((i) => ({
        barcode: i.barcode,
        quantity: i.accepted_quantity,
      })),
    }, {
      organizationId,
      entityType: 'manifest_accept',
      entityId: manifestId,
    })

    logger.info('Manifest accepted in BioTrack', { manifestId, itemCount: items.length })
    return true
  } catch (err) {
    logger.error('Failed to accept manifest in BioTrack', { error: String(err), manifestId })
    return false
  }
}
