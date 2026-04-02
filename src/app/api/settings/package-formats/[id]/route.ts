import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getFormats, saveFormats } from '@/lib/services/packageFormatService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await request.json()

    const formats = await getFormats(session.locationId)
    const index = formats.findIndex(f => f.id === id)

    const target = formats[index]
    if (index === -1 || !target) {
      return NextResponse.json({ error: 'Format not found' }, { status: 404 })
    }

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      target.name = body.name.trim()
    }

    if (body.format !== undefined) {
      if (typeof body.format !== 'string' || body.format.trim().length === 0) {
        return NextResponse.json({ error: 'Format template cannot be empty' }, { status: 400 })
      }
      target.format = body.format.trim()
    }

    if (body.category_id !== undefined) {
      target.category_id = body.category_id
    }

    if (body.is_active !== undefined) {
      target.is_active = Boolean(body.is_active)
    }

    const saved = await saveFormats(session.locationId, formats)

    return NextResponse.json({ formats: saved })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('PATCH /api/settings/package-formats/[id] error', { error: String(err) })
    return NextResponse.json({ error: 'Failed to update format' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const formats = await getFormats(session.locationId)
    const index = formats.findIndex(f => f.id === id)
    const target = formats[index]

    if (index === -1 || !target) {
      return NextResponse.json({ error: 'Format not found' }, { status: 404 })
    }

    target.is_active = false

    const saved = await saveFormats(session.locationId, formats)

    return NextResponse.json({ formats: saved })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('DELETE /api/settings/package-formats/[id] error', { error: String(err) })
    return NextResponse.json({ error: 'Failed to deactivate format' }, { status: 500 })
  }
}
