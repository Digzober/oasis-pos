import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const body = await request.json()
    const sb = await createSupabaseServerClient()

    // Verify PO exists and belongs to org
    const { data: po, error: poErr } = await sb
      .from('purchase_orders')
      .select('id, status, organization_id')
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single()

    if (poErr || !po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    if (po.status !== 'draft') {
      return NextResponse.json({ error: 'Lines can only be added to draft POs' }, { status: 400 })
    }

    const unitCost = Number(body.unit_cost) || 0
    const qtyOrdered = Number(body.quantity_ordered) || 1
    const totalCost = unitCost * qtyOrdered

    const { data: line, error } = await sb
      .from('purchase_order_lines')
      .insert({
        purchase_order_id: id,
        product_id: body.product_id,
        quantity_ordered: qtyOrdered,
        unit_cost: unitCost,
        total_cost: totalCost,
        quantity_received: 0,
        notes: body.notes || null,
      })
      .select('*, products ( id, name, sku )')
      .single()

    if (error) {
      logger.error('PO line create error', { error: error.message })
      return NextResponse.json({ error: 'Failed to add line' }, { status: 500 })
    }

    // Recalculate PO total
    const { data: allLines } = await sb
      .from('purchase_order_lines')
      .select('total_cost')
      .eq('purchase_order_id', id)

    const poTotal = (allLines ?? []).reduce(
      (sum: number, l: { total_cost: number | null }) => sum + (l.total_cost ?? 0),
      0
    )

    await sb
      .from('purchase_orders')
      .update({ total_cost: poTotal })
      .eq('id', id)

    return NextResponse.json({ line }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('PO line create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const url = new URL(request.url)
    const lineId = url.searchParams.get('line_id')
    const sb = await createSupabaseServerClient()

    if (!lineId) {
      return NextResponse.json({ error: 'line_id is required' }, { status: 400 })
    }

    // Verify PO exists and is draft
    const { data: po, error: poErr } = await sb
      .from('purchase_orders')
      .select('id, status, organization_id')
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single()

    if (poErr || !po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    if (po.status !== 'draft') {
      return NextResponse.json({ error: 'Lines can only be removed from draft POs' }, { status: 400 })
    }

    const { error } = await sb
      .from('purchase_order_lines')
      .delete()
      .eq('id', lineId)
      .eq('purchase_order_id', id)

    if (error) {
      logger.error('PO line delete error', { error: error.message })
      return NextResponse.json({ error: 'Failed to remove line' }, { status: 500 })
    }

    // Recalculate PO total
    const { data: allLines } = await sb
      .from('purchase_order_lines')
      .select('total_cost')
      .eq('purchase_order_id', id)

    const poTotal = (allLines ?? []).reduce(
      (sum: number, l: { total_cost: number | null }) => sum + (l.total_cost ?? 0),
      0
    )

    await sb
      .from('purchase_orders')
      .update({ total_cost: poTotal })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('PO line delete error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
