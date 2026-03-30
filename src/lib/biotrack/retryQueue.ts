import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { getBioTrackClient } from './client'

const MAX_RETRIES = 3

export async function processBioTrackRetryQueue(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const sb = await createSupabaseServerClient()

  const { data: pending, error } = await sb
    .from('biotrack_sync_log')
    .select('*')
    .eq('status', 'failed')
    .lt('retry_count', MAX_RETRIES)
    .order('created_at', { ascending: true })
    .limit(10)

  if (error || !pending || pending.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  let succeeded = 0
  let failed = 0
  const client = getBioTrackClient()

  for (const entry of pending) {
    try {
      const payload = (entry.request_payload ?? {}) as Record<string, unknown>
      const response = await client.call(entry.biotrack_endpoint, payload)

      // Update sync log
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sb
        .from('biotrack_sync_log')
        .update({
          status: 'success',
          response_payload: response as any,
          completed_at: new Date().toISOString(),
          retry_count: entry.retry_count + 1,
        })
        .eq('id', entry.id)

      // Update transaction if this was a sale sync
      if (entry.entity_type === 'transaction' && entry.entity_id) {
        const saleId = (response.data as { sale_id?: string })?.sale_id ?? null
        await sb
          .from('transactions')
          .update({
            biotrack_transaction_id: saleId,
            biotrack_synced: true,
            biotrack_synced_at: new Date().toISOString(),
            biotrack_sync_error: null,
          })
          .eq('id', entry.entity_id)
      }

      succeeded++
      logger.info('BioTrack retry succeeded', { syncLogId: entry.id, endpoint: entry.biotrack_endpoint })
    } catch (err) {
      const newRetryCount = entry.retry_count + 1
      const newStatus = newRetryCount >= MAX_RETRIES ? 'failed' : 'failed'

      await sb
        .from('biotrack_sync_log')
        .update({
          retry_count: newRetryCount,
          error_message: err instanceof Error ? err.message : String(err),
        })
        .eq('id', entry.id)

      failed++
      logger.warn('BioTrack retry failed', {
        syncLogId: entry.id,
        retryCount: newRetryCount,
        maxRetries: MAX_RETRIES,
      })
    }
  }

  return { processed: pending.length, succeeded, failed }
}
