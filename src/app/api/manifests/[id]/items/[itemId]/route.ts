import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import {
  updateManifestItem,
  removeManifestItem,
} from '@/lib/services/manifestService'
import type { UpdateManifestItemInput } from '@/lib/services/manifestService'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await requireSession()
    const { id, itemId } = await context.params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Manifest ID is required' }, { status: 400 })
    }

    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    const body = await request.json()

    const allowedFields = [
      'quantity', 'accepted_quantity', 'unit_price', 'discount',
      'subtotal', 'total_price', 'discrepancy_reason', 'sort_order',
      'description', 'sku', 'package_id', 'batch', 'brand',
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

    // Validate quantity if present
    if ('quantity' in updates && (typeof updates.quantity !== 'number' || (updates.quantity as number) <= 0)) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 })
    }

    // Validate accepted_quantity if present
    if ('accepted_quantity' in updates && updates.accepted_quantity !== null) {
      if (typeof updates.accepted_quantity !== 'number' || (updates.accepted_quantity as number) < 0) {
        return NextResponse.json({ error: 'Accepted quantity must be a non-negative number' }, { status: 400 })
      }
    }

    const item = await updateManifestItem(itemId, updates as UpdateManifestItemInput)

    return NextResponse.json({ item })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      )
    }
    logger.error('Update manifest item error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await requireSession()
    const { id, itemId } = await context.params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Manifest ID is required' }, { status: 400 })
    }

    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    await removeManifestItem(itemId)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      )
    }
    logger.error('Remove manifest item error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
