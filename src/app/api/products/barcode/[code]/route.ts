import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { lookupBarcode } from '@/lib/services/barcodeLookupService'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const session = await requireSession()
    const { code } = await params
    const locationId = request.nextUrl.searchParams.get('location_id') ?? session.locationId

    const result = await lookupBarcode(code, locationId)

    if (!result) {
      return NextResponse.json({ error: 'Barcode not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Barcode lookup error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
