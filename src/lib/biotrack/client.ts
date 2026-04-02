import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { BioTrackConfig, BioTrackResponse } from './types'
import { BioTrackError } from './types'

const RETRY_DELAYS = [1000, 2000, 4000]
const TOKEN_REFRESH_MS = 50 * 60 * 1000 // refresh at 50 min

export class BioTrackClient {
  private sessionToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(private config: BioTrackConfig) {}

  private isAuthenticated(): boolean {
    if (!this.sessionToken || !this.tokenExpiry) return false
    return new Date() < this.tokenExpiry
  }

  async authenticate(): Promise<void> {
    try {
      // BioTrack Trace 2.0 v3 REST API uses /v1/login with PascalCase fields
      // Response contains "Session" key used as Bearer token for subsequent requests
      const res = await fetch(`${this.config.v3Url}/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Username: this.config.username,
          Password: this.config.password,
          UBI: this.config.licenseNumber,
        }),
      })

      const body = await res.json()

      if (!res.ok || body.Error) {
        throw new BioTrackError(
          `Authentication failed: ${body.Error ?? body.error ?? res.statusText}`,
          res.status,
          body.Error ?? body.error,
        )
      }

      // v3 returns session token in "Session" or "sessionid" field
      this.sessionToken = body.Session ?? body.sessionid ?? body.data?.token ?? body.token
      if (!this.sessionToken) {
        throw new BioTrackError('Authentication succeeded but no session token in response', 500)
      }
      this.tokenExpiry = new Date(Date.now() + TOKEN_REFRESH_MS)
      logger.info('BioTrack authenticated', { licenseNumber: this.config.licenseNumber })
    } catch (err) {
      if (err instanceof BioTrackError) throw err
      throw new BioTrackError(`Authentication connection failed: ${String(err)}`, 503)
    }
  }

  async call(
    endpoint: string,
    payload: Record<string, unknown>,
    meta?: { organizationId: string; locationId?: string; entityType: string; entityId?: string },
  ): Promise<BioTrackResponse> {
    if (!this.isAuthenticated()) {
      await this.authenticate()
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        const res = await fetch(`${this.config.v3Url}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.sessionToken}`,
          },
          body: JSON.stringify(payload),
        })

        const body: BioTrackResponse = await res.json()

        // Log to sync log
        if (meta) {
          await this.logSync({
            organizationId: meta.organizationId,
            locationId: meta.locationId ?? null,
            endpoint,
            payload,
            response: body,
            status: body.success ? 'success' : 'failed',
            errorMessage: body.error,
            entityType: meta.entityType,
            entityId: meta.entityId ?? null,
          })
        }

        if (!res.ok || !body.success) {
          // If auth expired, re-auth and retry once
          if (res.status === 401 && attempt === 0) {
            await this.authenticate()
            continue
          }
          throw new BioTrackError(
            body.error ?? `BioTrack error: ${res.statusText}`,
            res.status,
            body.error,
          )
        }

        return body
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        if (attempt < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[attempt]!
          logger.warn('BioTrack call failed, retrying', {
            endpoint,
            attempt: attempt + 1,
            delay,
            error: lastError.message,
          })
          await new Promise((r) => setTimeout(r, delay))
        }
      }
    }

    // All retries exhausted — log failure
    if (meta) {
      await this.logSync({
        organizationId: meta.organizationId,
        locationId: meta.locationId ?? null,
        endpoint,
        payload,
        response: null,
        status: 'failed',
        errorMessage: lastError?.message ?? 'Unknown error after retries',
        entityType: meta.entityType,
        entityId: meta.entityId ?? null,
      })
    }

    throw lastError ?? new BioTrackError('BioTrack call failed after retries')
  }

  private async logSync(params: {
    organizationId: string
    locationId: string | null
    endpoint: string
    payload: Record<string, unknown>
    response: unknown
    status: string
    errorMessage: string | null
    entityType: string
    entityId: string | null
  }): Promise<void> {
    try {
      const sb = await createSupabaseServerClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sb.from('biotrack_sync_log').insert({
        organization_id: params.organizationId,
        location_id: params.locationId,
        api_version: 'v3',
        biotrack_endpoint: params.endpoint,
        direction: 'outbound',
        sync_type: 'auto',
        request_payload: params.payload,
        response_payload: params.response,
        status: params.status,
        error_message: params.errorMessage,
        entity_type: params.entityType,
        entity_id: params.entityId,
        completed_at: params.status === 'success' ? new Date().toISOString() : null,
      } as any)
    } catch (err) {
      logger.error('Failed to log BioTrack sync', { error: String(err) })
    }
  }
}

let clientInstance: BioTrackClient | null = null

/**
 * Gets a shared BioTrack v3 REST client using environment variables.
 * @deprecated Use getBioTrackClientForLocation() for per-location DB-driven config.
 */
export function getBioTrackClient(): BioTrackClient {
  if (!clientInstance) {
    clientInstance = new BioTrackClient({
      v1Url: process.env.BIOTRACK_V1_URL ?? '',
      v3Url: process.env.BIOTRACK_V3_URL ?? '',
      username: process.env.BIOTRACK_USERNAME ?? '',
      password: process.env.BIOTRACK_PASSWORD ?? '',
      licenseNumber: process.env.BIOTRACK_LICENSE_NUMBER ?? '',
    })
  }
  return clientInstance
}

// Per-location client cache: locationId -> { client, expiresAt }
const locationClients = new Map<string, { client: BioTrackClient; expiresAt: number }>()
const CLIENT_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Gets a BioTrack v3 REST client configured for a specific location.
 * Loads credentials from the biotrack_config table.
 * Caches client instances to reuse auth tokens across requests.
 */
export async function getBioTrackClientForLocation(locationId: string): Promise<BioTrackClient | null> {
  const cached = locationClients.get(locationId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.client
  }

  // Dynamic import to avoid circular dependency
  const { loadBioTrackConfig } = await import('./configLoader')
  const config = await loadBioTrackConfig(locationId)

  if (!config) {
    return null
  }

  const client = new BioTrackClient(config)
  locationClients.set(locationId, { client, expiresAt: Date.now() + CLIENT_CACHE_TTL_MS })
  return client
}
