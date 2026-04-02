import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { addManifestItem } from '@/lib/services/manifestService'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
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

    const {
      product_id,
      inventory_item_id,
      sku,
      description,
      package_id,
      batch,
      brand,
      quantity,
      unit_price,
      discount,
    } = body

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Item description is required' }, { status: 400 })
    }

    if (quantity === undefined || quantity === null || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 })
    }

    const item = await addManifestItem(id, {
      product_id: product_id ?? undefined,
      inventory_item_id: inventory_item_id ?? undefined,
      quantity,
      unit_price: unit_price ?? 0,
      discount: discount ?? 0,
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      )
    }
    logger.error('Add manifest item error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
