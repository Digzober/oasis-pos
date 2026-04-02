// v3 REST client
export { BioTrackClient, getBioTrackClient, getBioTrackClientForLocation } from './client'

// v1 XML/SOAP client (NM-specific operations)
export { BioTrackV1Client } from './v1Client'

// Config loader (DB-driven per-location config)
export { loadBioTrackConfig, clearBioTrackConfigCache, seedBioTrackConfig } from './configLoader'
export type { BioTrackLocationConfig } from './configLoader'

// Sale sync operations
export { syncSaleToBioTrack, syncVoidToBioTrack, syncRefundToBioTrack } from './saleSync'

// Retry queue
export { processBioTrackRetryQueue } from './retryQueue'

// Inventory operations
export { fetchPendingManifests, acceptManifestTransfer } from './inventorySync'
export { pullBioTrackInventory, pullAllLocations } from './inventoryPull'

// Types
export { BioTrackError } from './types'
export type {
  BioTrackConfig,
  BioTrackResponse,
  SaleDispensePayload,
  SaleVoidPayload,
  SaleRefundPayload,
} from './types'
export type {
  BioTrackManifest,
  BioTrackManifestItem,
  ProductMatch,
  AcceptedManifestItem,
  ReceiveManifestInput,
  ManualReceiveInput,
  ReceiveResult,
} from './inventoryTypes'
