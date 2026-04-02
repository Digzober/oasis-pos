import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { matchBioTrackItem } from '@/lib/services/productMatchingService'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const url = new URL(request.url)

    const biotrackName = url.searchParams.get('biotrack_name') ?? ''
    const biotrackBarcode = url.searchParams.get('biotrack_barcode') ?? ''
    const biotrackCategory = url.searchParams.get('biotrack_category') ?? ''

    if (!biotrackName && !biotrackBarcode) {
      return NextResponse.json(
        { error: 'At least one of biotrack_name or biotrack_barcode is required' },
        { status: 400 }
      )
    }

    const matches = await matchBioTrackItem(
      biotrackName,
      biotrackBarcode,
      biotrackCategory,
      session.organizationId
    )

    return NextResponse.json({ matches })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product match error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
