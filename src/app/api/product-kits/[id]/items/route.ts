import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession()
    const { id: kitId } = await context.params
    const body = await request.json()

    const { product_id, quantity, sort_order } = body as {
      product_id?: string
      quantity?: number
      sort_order?: number
    }

    if (!product_id || typeof product_id !== 'string') {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }
    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive number' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    // Verify the kit belongs to this org
    const { data: kit, error: kitError } = await sb
      .from('product_kits')
      .select('id')
      .eq('id', kitId)
      .eq('organization_id', session.organizationId)
      .single()

    if (kitError || !kit) {
      return NextResponse.json({ error: 'Product kit not found' }, { status: 404 })
    }

    // Determine sort_order if not provided
    let finalSortOrder = sort_order ?? 0
    if (!sort_order) {
      const { data: existing } = await sb
        .from('product_kit_items')
        .select('sort_order')
        .eq('kit_id', kitId)
        .order('sort_order', { ascending: false })
        .limit(1)

      finalSortOrder = (existing && existing.length > 0 && existing[0]) ? (existing[0].sort_order ?? 0) + 1 : 0
    }

    const { data: item, error } = await sb
      .from('product_kit_items')
      .insert({
        kit_id: kitId,
        product_id,
        quantity,
        sort_order: finalSortOrder,
      })
      .select('*, products ( id, name, sku, rec_price )')
      .single()

    if (error) {
      logger.error('Product kit item add failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to add item to kit' }, { status: 500 })
    }

    const product = item.products as { id: string; name: string; sku: string | null; rec_price: number | null } | null

    return NextResponse.json({
      item: {
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        sort_order: item.sort_order,
        product_name: product?.name ?? 'Unknown',
        product_sku: product?.sku ?? null,
        product_price: product?.rec_price ?? null,
      },
    }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product kit item add error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession()
    const { id: kitId } = await context.params
    const body = await request.json()

    const { item_id } = body as { item_id?: string }

    if (!item_id || typeof item_id !== 'string') {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    // Verify the kit belongs to this org
    const { data: kit, error: kitError } = await sb
      .from('product_kits')
      .select('id')
      .eq('id', kitId)
      .eq('organization_id', session.organizationId)
      .single()

    if (kitError || !kit) {
      return NextResponse.json({ error: 'Product kit not found' }, { status: 404 })
    }

    const { error } = await sb
      .from('product_kit_items')
      .delete()
      .eq('id', item_id)
      .eq('kit_id', kitId)

    if (error) {
      logger.error('Product kit item remove failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to remove item from kit' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product kit item remove error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
