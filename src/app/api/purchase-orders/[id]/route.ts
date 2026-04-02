import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const sb = await createSupabaseServerClient()

    const { data: po, error } = await sb
      .from('purchase_orders')
      .select(
        '*, vendors ( id, name ), locations ( id, name ), employees:created_by ( id, first_name, last_name ), purchase_order_lines ( *, products ( id, name, sku ) )'
      )
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single()

    if (error || !po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    return NextResponse.json({ purchase_order: po })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('PO detail error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireSession()
    const { id } = await context.params
    const body = await request.json()
    const sb = await createSupabaseServerClient()

    // Fetch current PO
    const { data: current, error: fetchErr } = await sb
      .from('purchase_orders')
      .select('*, purchase_order_lines ( *, products ( id, name, sku, brand_id, vendor_id, strain_id, category_id ) )')
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single()

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    const action = body.action as string | undefined

    // Handle status transitions
    if (action === 'submit') {
      if (current.status !== 'draft') {
        return NextResponse.json({ error: 'Only draft POs can be submitted' }, { status: 400 })
      }
      const { error } = await sb
        .from('purchase_orders')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) {
        logger.error('PO submit error', { error: error.message })
        return NextResponse.json({ error: 'Failed to submit PO' }, { status: 500 })
      }
      return NextResponse.json({ success: true, status: 'submitted' })
    }

    if (action === 'cancel') {
      if (!['draft', 'submitted'].includes(current.status)) {
        return NextResponse.json({ error: 'Only draft or submitted POs can be cancelled' }, { status: 400 })
      }
      const { error } = await sb
        .from('purchase_orders')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (error) {
        logger.error('PO cancel error', { error: error.message })
        return NextResponse.json({ error: 'Failed to cancel PO' }, { status: 500 })
      }
      return NextResponse.json({ success: true, status: 'cancelled' })
    }

    if (action === 'receive') {
      if (!['submitted', 'partial'].includes(current.status)) {
        return NextResponse.json({ error: 'Only submitted or partial POs can be received' }, { status: 400 })
      }

      const receivedLines = body.lines as Array<{ line_id: string; quantity_received: number }> | undefined
      if (!receivedLines || receivedLines.length === 0) {
        return NextResponse.json({ error: 'No lines to receive' }, { status: 400 })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const poLines = current.purchase_order_lines as any[]
      let allFullyReceived = true

      for (const recv of receivedLines) {
        const line = poLines.find((l: { id: string }) => l.id === recv.line_id)
        if (!line) continue

        const prevReceived = line.quantity_received ?? 0
        const newReceived = prevReceived + recv.quantity_received

        // Update line's quantity_received
        await sb
          .from('purchase_order_lines')
          .update({
            quantity_received: newReceived,
            total_cost: newReceived * (line.unit_cost ?? 0),
          })
          .eq('id', recv.line_id)

        if (newReceived < line.quantity_ordered) {
          allFullyReceived = false
        }

        // Create inventory_items for received quantities
        if (recv.quantity_received > 0) {
          await sb.from('inventory_items').insert({
            organization_id: session.organizationId,
            location_id: current.location_id,
            product_id: line.product_id,
            quantity: recv.quantity_received,
            unit_cost: line.unit_cost ?? 0,
            total_cost: recv.quantity_received * (line.unit_cost ?? 0),
            is_active: true,
            source: 'purchase_order',
            vendor_id: current.vendor_id,
          })
        }
      }

      // Check lines not in the received batch
      for (const line of poLines) {
        const inBatch = receivedLines.find(r => r.line_id === line.id)
        if (!inBatch) {
          const prevReceived = line.quantity_received ?? 0
          if (prevReceived < line.quantity_ordered) {
            allFullyReceived = false
          }
        }
      }

      const newStatus = allFullyReceived ? 'received' : 'partial'

      // Recalculate total cost
      const { data: updatedLines } = await sb
        .from('purchase_order_lines')
        .select('total_cost')
        .eq('purchase_order_id', id)

      const totalCost = (updatedLines ?? []).reduce(
        (sum: number, l: { total_cost: number | null }) => sum + (l.total_cost ?? 0),
        0
      )

      await sb
        .from('purchase_orders')
        .update({ status: newStatus, total_cost: totalCost })
        .eq('id', id)

      return NextResponse.json({ success: true, status: newStatus })
    }

    if (action === 'complete_receiving') {
      if (current.status !== 'partial') {
        return NextResponse.json({ error: 'Only partial POs can be completed' }, { status: 400 })
      }
      const { error } = await sb
        .from('purchase_orders')
        .update({ status: 'received' })
        .eq('id', id)
      if (error) {
        logger.error('PO complete error', { error: error.message })
        return NextResponse.json({ error: 'Failed to complete PO' }, { status: 500 })
      }
      return NextResponse.json({ success: true, status: 'received' })
    }

    // Generic field updates (vendor, notes, expected_delivery_date)
    const updates: Record<string, unknown> = {}
    if (body.vendor_id !== undefined) updates.vendor_id = body.vendor_id
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.expected_delivery_date !== undefined) updates.expected_delivery_date = body.expected_delivery_date
    if (body.location_id !== undefined) updates.location_id = body.location_id

    if (Object.keys(updates).length > 0) {
      if (current.status !== 'draft') {
        return NextResponse.json({ error: 'Only draft POs can be edited' }, { status: 400 })
      }
      const { error } = await sb
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
      if (error) {
        logger.error('PO update error', { error: error.message })
        return NextResponse.json({ error: 'Failed to update PO' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('PO update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
