import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import type { TaxRateConfig } from './tax.types'

interface CacheEntry {
  rates: TaxRateConfig[]
  fetchedAt: number
}

const TTL_MS = 5 * 60 * 1000
const cache = new Map<string, CacheEntry>()

export async function loadTaxRatesForLocation(
  locationId: string,
): Promise<TaxRateConfig[]> {
  const cached = cache.get(locationId)
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.rates
  }

  const sb = await createSupabaseServerClient()

  const { data, error } = await sb
    .from('tax_rates')
    .select('id, name, rate_percent, is_excise, applies_to, tax_category_id')
    .eq('location_id', locationId)
    .eq('is_active', true)

  if (error) {
    logger.error('Failed to load tax rates', { locationId, error: error.message })
    throw new AppError('TAX_RATES_NOT_FOUND', `Failed to load tax rates for location ${locationId}`, error, 500)
  }

  if (!data || data.length === 0) {
    logger.warn('No tax rates configured for location', { locationId })
  }

  const rates: TaxRateConfig[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    rate_percent: row.rate_percent,
    is_excise: row.is_excise,
    applies_to: row.applies_to as TaxRateConfig['applies_to'],
    tax_category_id: row.tax_category_id,
  }))

  cache.set(locationId, { rates, fetchedAt: Date.now() })
  return rates
}

export function clearTaxRateCache(): void {
  cache.clear()
}
