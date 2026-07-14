import { createHash, randomUUID } from 'node:crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { DutchieClient } from './client'
import { loadDutchieConfig } from './configLoader'
import type { SyncResult } from './types'
import { acquireSyncLease, completeSyncLease, heartbeatSyncLease } from './syncLease'

export interface LoyaltySnapshotRow {
  dutchieCustomerId: number
  balance: number
  earned: number
  spent: number
}

function numericField(row: Record<string, unknown>, camel: string, pascal: string): number {
  const value = Number(row[camel] ?? row[pascal])
  if (!Number.isFinite(value) || value < 0 || value > 9_999_999_999.99) {
    throw new Error(`Invalid Dutchie loyalty field: ${camel}`)
  }
  return Math.round(value * 100) / 100
}

export function normalizeLoyaltySnapshot(input: unknown): LoyaltySnapshotRow[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error('Dutchie loyalty snapshot must be a non-empty array')
  }

  const seen = new Set<number>()
  return input.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid Dutchie loyalty row')
    const row = raw as Record<string, unknown>
    const dutchieCustomerId = Number(row.customerId ?? row.CustomerId)
    if (!Number.isSafeInteger(dutchieCustomerId) || dutchieCustomerId <= 0) {
      throw new Error('Invalid Dutchie loyalty field: customerId')
    }
    if (seen.has(dutchieCustomerId)) {
      throw new Error(`Duplicate Dutchie loyalty customer: ${dutchieCustomerId}`)
    }
    seen.add(dutchieCustomerId)

    return {
      dutchieCustomerId,
      balance: numericField(row, 'loyaltyBalance', 'LoyaltyBalance'),
      earned: numericField(row, 'loyaltyEarned', 'LoyaltyEarned'),
      spent: numericField(row, 'loyaltySpent', 'LoyaltySpent'),
    }
  })
}

export function computeLoyaltyFingerprint(rows: LoyaltySnapshotRow[]): string {
  const canonical = [...rows]
    .sort((a, b) => a.dutchieCustomerId - b.dutchieCustomerId)
    .map(row => [
      row.dutchieCustomerId,
      row.balance.toFixed(2),
      row.earned.toFixed(2),
      row.spent.toFixed(2),
    ])
  const digest = createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
  return `${rows.length}:${digest}`
}

export function passesLoyaltyMatchGuard(matched: number, total: number): boolean {
  return total > 0 && matched / total >= 0.3
}

export async function runAfterLoyaltyMatchGuard<T>(
  matched: number,
  total: number,
  apply: () => Promise<T>,
): Promise<T> {
  if (!passesLoyaltyMatchGuard(matched, total)) {
    throw new Error(`Loyalty match-rate guard failed: ${matched}/${total}`)
  }
  return apply()
}

interface LoyaltySyncOptions {
  deadline?: number
}

interface LoyaltyChunkResult {
  processed?: number
  journaled?: number
  unmatched?: number
}

function emptyResult(): SyncResult {
  return {
    entityType: 'loyalty',
    syncType: 'full',
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errored: 0,
    errors: [],
    durationMs: 0,
  }
}

export async function syncLoyalty(
  locationId: string,
  organizationId: string,
  options: LoyaltySyncOptions = {},
): Promise<SyncResult> {
  const startedAt = Date.now()
  const result = emptyResult()
  const sb = await createSupabaseServerClient()
  const config = await loadDutchieConfig(locationId, organizationId)
  const { data: loyaltyState, error: loyaltyStateError } = await (sb as any)
    .from('dutchie_sync_state')
    .select('is_enabled, last_synced_at')
    .eq('organization_id', organizationId)
    .eq('entity_type', 'loyalty')
    .is('location_id', null)
    .maybeSingle()
  if (loyaltyStateError) throw loyaltyStateError

  const loyaltyEnabled = loyaltyState?.is_enabled ?? config?.syncLoyalty ?? true
  if (!config?.isEnabled || !config.apiKey || !loyaltyEnabled) {
    result.durationMs = Date.now() - startedAt
    return result
  }

  result.syncType = loyaltyState?.last_synced_at || config.lastSyncedLoyaltyAt ? 'incremental' : 'full'
  const leaseId = await acquireSyncLease(sb, {
    organizationId,
    locationId,
    entityType: 'loyalty',
    syncType: result.syncType,
  })

  try {
    await (sb as any).from('dutchie_loyalty_staging')
      .delete()
      .eq('organization_id', organizationId)
      .eq('staging_complete', false)
      .lt('created_at', new Date(Date.now() - 86_400_000).toISOString())

    const fingerprintLookup = await (sb as any).from('dutchie_loyalty_staging')
      .select('run_id, run_fingerprint')
      .eq('organization_id', organizationId)
      .eq('staging_complete', true)
      .is('applied_at', null)
      .limit(1)
      .maybeSingle()

    let runId = fingerprintLookup.data?.run_id as string | undefined
    if (!runId) {
      const snapshot = normalizeLoyaltySnapshot(await new DutchieClient(config.apiKey).getLoyaltySnapshot())
      result.fetched = snapshot.length
      const fingerprint = computeLoyaltyFingerprint(snapshot)

      const resumable = await (sb as any).from('dutchie_loyalty_staging')
        .select('run_id')
        .eq('organization_id', organizationId)
        .eq('run_fingerprint', fingerprint)
        .eq('staging_complete', true)
        .is('applied_at', null)
        .limit(1)
        .maybeSingle()

      runId = resumable.data?.run_id as string | undefined
      if (!runId) {
        runId = randomUUID()
        const stagingRows = snapshot.map(row => ({
          organization_id: organizationId,
          run_id: runId,
          run_fingerprint: fingerprint,
          dutchie_customer_id: row.dutchieCustomerId,
          balance: row.balance,
          earned: row.earned,
          spent: row.spent,
        }))
        for (let offset = 0; offset < stagingRows.length; offset += 1000) {
          const { error } = await (sb as any).from('dutchie_loyalty_staging')
            .insert(stagingRows.slice(offset, offset + 1000))
          if (error) throw error
          await heartbeatSyncLease(sb, leaseId)
        }
        const { error: stagedError } = await (sb as any).from('dutchie_loyalty_staging')
          .update({ staging_complete: true })
          .eq('organization_id', organizationId)
          .eq('run_id', runId)
        if (stagedError) throw stagedError
      }
    } else {
      const { count } = await (sb as any).from('dutchie_loyalty_staging')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('run_id', runId)
        .eq('staging_complete', true)
      result.fetched = count ?? 0
    }

    const { data: matchData, error: matchError } = await (sb as any).rpc(
      'count_dutchie_loyalty_matches',
      { p_org: organizationId, p_run: runId },
    )
    if (matchError) throw matchError
    const match = Array.isArray(matchData) ? matchData[0] : matchData
    const matched = Number(match?.matched_count ?? 0)
    const total = Number(match?.total_count ?? result.fetched)
    await runAfterLoyaltyMatchGuard(matched, total, async () => {
      while (!options.deadline || Date.now() < options.deadline) {
        const { data, error } = await (sb as any).rpc('apply_dutchie_loyalty_chunk', {
          p_org: organizationId,
          p_run: runId,
          p_limit: 1000,
        })
        if (error) throw error
        const chunk = (Array.isArray(data) ? data[0] : data) as LoyaltyChunkResult | null
        const processed = Number(chunk?.processed ?? 0)
        result.updated += Number(chunk?.journaled ?? 0)
        result.skipped += Number(chunk?.unmatched ?? 0)
        await heartbeatSyncLease(sb, leaseId)
        if (processed === 0) break
      }
    })

    const { count: remaining, error: remainingError } = await (sb as any)
      .from('dutchie_loyalty_staging')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('run_id', runId)
      .eq('staging_complete', true)
      .is('applied_at', null)
    if (remainingError) throw remainingError

    if ((remaining ?? 0) === 0) {
      const checkpoint = new Date(startedAt).toISOString()
      const { error: stateError } = await (sb as any).rpc('checkpoint_dutchie_sync_state', {
        p_org: organizationId,
        p_location: null,
        p_entity: 'loyalty',
        p_checkpoint: checkpoint,
        p_cursor: null,
      })
      if (stateError) throw stateError
      await (sb as any).from('dutchie_config')
        .update({ last_synced_loyalty_at: checkpoint })
        .eq('location_id', locationId)
      await (sb as any).from('dutchie_loyalty_staging')
        .delete()
        .eq('organization_id', organizationId)
        .not('applied_at', 'is', null)
        .lt('applied_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    result.errored++
    result.errors.push(message)
    logger.error('Dutchie loyalty sync failed', { organizationId, message })
  }

  result.durationMs = Date.now() - startedAt
  await completeSyncLease(sb, leaseId, result)
  return result
}
