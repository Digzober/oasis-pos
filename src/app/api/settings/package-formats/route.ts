import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getFormats, saveFormats, SUPPORTED_TOKENS } from '@/lib/services/packageFormatService'
import type { PackageFormat } from '@/lib/services/packageFormatService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await requireSession()
    const formats = await getFormats(session.locationId)

    return NextResponse.json({
      formats,
      tokens: SUPPORTED_TOKENS,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('GET /api/settings/package-formats error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!body.format || typeof body.format !== 'string' || body.format.trim().length === 0) {
      return NextResponse.json({ error: 'Format template is required' }, { status: 400 })
    }

    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Client-generated ID is required' }, { status: 400 })
    }

    const existing = await getFormats(session.locationId)

    const newFormat: PackageFormat = {
      id: body.id,
      name: body.name.trim(),
      category_id: body.category_id ?? null,
      format: body.format.trim(),
      is_active: true,
    }

    const updated = [...existing, newFormat]
    const saved = await saveFormats(session.locationId, updated)

    return NextResponse.json({ formats: saved }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('POST /api/settings/package-formats error', { error: String(err) })
    return NextResponse.json({ error: 'Failed to create format' }, { status: 500 })
  }
}
