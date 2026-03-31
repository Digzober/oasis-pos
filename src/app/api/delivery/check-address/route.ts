import { NextRequest, NextResponse } from 'next/server'
import { checkDeliveryEligibility } from '@/lib/services/deliveryService'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest) {
  try {
    const { address, location_id } = await req.json()
    const result = await checkDeliveryEligibility(address, location_id)
    return NextResponse.json(result)
  } catch (err) { logger.error('Check address error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
