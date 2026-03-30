import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { PurchaseLimitConfig } from './purchaseLimit.types'

interface CacheEntry {
  limits: PurchaseLimitConfig[]
  fetchedAt: number
}

const TTL_MS = 10 * 60 * 1000
const cache = new Map<string, CacheEntry>()

export async function loadPurchaseLimits(
  organizationId: string,
  locationId: string,
): Promise<PurchaseLimitConfig[]> {
  const key = `${organizationId}:${locationId}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.limits

  const sb = await createSupabaseServerClient()

  // Load both location-specific and org-wide limits
  const { data, error } = await sb
    .from('purchase_limits')
    .select('category_id, customer_type, max_amount, location_id, is_active')
    .eq('is_active', true)
    .or(`location_id.eq.${locationId},location_id.is.null`)

  if (error) {
    logger.error('Failed to load purchase limits', { error: error.message })
    return []
  }

  if (!data || data.length === 0) {
    logger.warn('No purchase limits configured', { organizationId, locationId })
    return []
  }

  // Prefer location-specific over org-wide
  const limitMap = new Map<string, PurchaseLimitConfig>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of data as any[]) {
    const catType = row.category_type ?? 'flower'
    const custType = row.customer_type ?? 'both'
    const mapKey = `${catType}:${custType}`

    const existing = limitMap.get(mapKey)
    // Location-specific overrides org-wide
    if (!existing || (row.location_id && !existing)) {
      limitMap.set(mapKey, {
        category_type: catType,
        customer_type: custType,
        limit_amount: row.max_amount ?? 2.0,
        equivalency_ratio: 1.0,
        time_period: 'per_transaction',
      })
    }
  }

  const limits = Array.from(limitMap.values())
  cache.set(key, { limits, fetchedAt: Date.now() })
  return limits
}

export function clearPurchaseLimitCache(): void {
  cache.clear()
}
