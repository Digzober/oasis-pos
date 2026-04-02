import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { previewFormat } from '@/lib/services/packageFormatService'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    await requireSession()
    const body = await request.json()

    if (!body.format || typeof body.format !== 'string') {
      return NextResponse.json({ error: 'Format template is required' }, { status: 400 })
    }

    const preview = previewFormat(body.format)

    return NextResponse.json({ preview })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('POST /api/settings/package-formats/preview error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
