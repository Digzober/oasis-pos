import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { loadTaxRatesForLocation } from '@/lib/calculations/taxRateLoader'
import { loadActiveDiscounts } from '@/lib/calculations/discountLoader'
import { loadPurchaseLimits } from '@/lib/calculations/purchaseLimitLoader'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const locationId = request.nextUrl.searchParams.get('location_id') ?? session.locationId

    const [taxRates, discounts, purchaseLimits] = await Promise.all([
      loadTaxRatesForLocation(locationId),
      loadActiveDiscounts(session.organizationId),
      loadPurchaseLimits(session.organizationId, locationId),
    ])

    return NextResponse.json({ taxRates, discounts, purchaseLimits })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Cart config error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
