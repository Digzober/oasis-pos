import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession()
    const { id } = await context.params

    const sb = await createSupabaseServerClient()

    const { data: kit, error } = await sb
      .from('product_kits')
      .select(`
        *,
        product_kit_items (
          id,
          product_id,
          quantity,
          sort_order,
          products ( id, name, sku, rec_price )
        )
      `)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single()

    if (error || !kit) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product kit not found' }, { status: 404 })
      }
      logger.error('Product kit detail query failed', { error: error?.message })
      return NextResponse.json({ error: 'Failed to fetch product kit' }, { status: 500 })
    }

    const items = (kit.product_kit_items ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((item) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        sort_order: item.sort_order ?? 0,
        product_name: (item.products as { name: string } | null)?.name ?? 'Unknown',
        product_sku: (item.products as { sku: string | null } | null)?.sku ?? null,
        product_price: (item.products as { rec_price: number | null } | null)?.rec_price ?? null,
      }))

    return NextResponse.json({
      kit: {
        id: kit.id,
        organization_id: kit.organization_id,
        name: kit.name,
        description: kit.description,
        sku: kit.sku,
        price: kit.price,
        is_active: kit.is_active,
        created_at: kit.created_at,
        updated_at: kit.updated_at,
        items,
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product kit detail error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = String(body.name).trim()
    if (body.description !== undefined) updates.description = body.description?.trim() ?? null
    if (body.sku !== undefined) updates.sku = body.sku?.trim() ?? null
    if (body.price !== undefined) updates.price = body.price

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    const { data: kit, error } = await sb
      .from('product_kits')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .select('*')
      .single()

    if (error || !kit) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product kit not found' }, { status: 404 })
      }
      logger.error('Product kit update failed', { error: error?.message })
      return NextResponse.json({ error: 'Failed to update product kit' }, { status: 500 })
    }

    return NextResponse.json({ kit })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product kit update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession()
    const { id } = await context.params

    const sb = await createSupabaseServerClient()

    const { data: kit, error } = await sb
      .from('product_kits')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .select('id')
      .single()

    if (error || !kit) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product kit not found' }, { status: 404 })
      }
      logger.error('Product kit deactivate failed', { error: error?.message })
      return NextResponse.json({ error: 'Failed to deactivate product kit' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product kit deactivate error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
