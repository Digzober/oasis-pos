import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import {
  getManifestDetail,
  updateManifest,
  deleteManifest,
} from '@/lib/services/manifestService'
import type { UpdateManifestInput } from '@/lib/services/manifestService'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await requireSession()
    const { id } = await context.params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Manifest ID is required' }, { status: 400 })
    }

    const manifest = await getManifestDetail(id)

    return NextResponse.json({ manifest })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      )
    }
    logger.error('Manifest detail error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await requireSession()
    const { id } = await context.params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Manifest ID is required' }, { status: 400 })
    }

    const body = await request.json()

    // Validate updatable fields
    const allowedFields = [
      'title', 'status', 'notes', 'driver_name', 'license_number',
      'point_of_contact', 'pickup', 'stop_number_on_route',
      'total_stops_on_route', 'subtotal', 'taxes', 'discounts',
      'credits', 'total', 'customer_name', 'tab',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const manifest = await updateManifest(id, updates as UpdateManifestInput)

    return NextResponse.json({ manifest })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      )
    }
    logger.error('Manifest update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await requireSession()
    const { id } = await context.params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Manifest ID is required' }, { status: 400 })
    }

    await deleteManifest(id)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      )
    }
    logger.error('Manifest delete error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
