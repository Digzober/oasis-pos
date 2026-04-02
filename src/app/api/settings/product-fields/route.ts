import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getFieldConfig, saveFieldConfig, CATALOG_FIELDS } from '@/lib/services/productFieldConfigService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await requireSession()
    const config = await getFieldConfig(session.locationId)

    return NextResponse.json({
      config,
      fields: CATALOG_FIELDS.map(f => ({
        key: f.key,
        label: f.label,
        default: f.default,
        lockRequired: f.lockRequired ?? false,
      })),
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('GET /api/settings/product-fields error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()

    if (!body.config || typeof body.config !== 'object') {
      return NextResponse.json(
        { error: 'Invalid input: config object is required' },
        { status: 400 },
      )
    }

    const saved = await saveFieldConfig(session.locationId, body.config)

    return NextResponse.json({ config: saved })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('PUT /api/settings/product-fields error', { error: String(err) })
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
  }
}
