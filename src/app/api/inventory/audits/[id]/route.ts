import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getEmployeePermissions, hasPermission } from '@/lib/services/permissionService'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

const AUDIT_SELECT = `
  *,
  locations ( id, name ),
  employees!inventory_audits_created_by_fkey ( id, first_name, last_name )
`

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params

    const sb = await createSupabaseServerClient()

    const { data: audit, error } = await sb
      .from('inventory_audits')
      .select(AUDIT_SELECT)
      .eq('id', id)
      .single()

    if (error || !audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    // Resolve scope names
    let scopeRoomNames: string[] = []
    let scopeCategoryNames: string[] = []

    if (audit.scope_rooms && audit.scope_rooms.length > 0) {
      const { data: rooms } = await sb
        .from('rooms')
        .select('id, name')
        .in('id', audit.scope_rooms)
      scopeRoomNames = (rooms ?? []).map(r => r.name)
    }

    if (audit.scope_categories && audit.scope_categories.length > 0) {
      const { data: cats } = await sb
        .from('product_categories')
        .select('id, name')
        .in('id', audit.scope_categories)
      scopeCategoryNames = (cats ?? []).map(c => c.name)
    }

    // Get count summary
    const { count: totalItems } = await sb
      .from('inventory_audit_items')
      .select('id', { count: 'exact', head: true })
      .eq('audit_id', id)

    const { count: countedItems } = await sb
      .from('inventory_audit_items')
      .select('id', { count: 'exact', head: true })
      .eq('audit_id', id)
      .not('counted_quantity', 'is', null)

    const { count: discrepancyItems } = await sb
      .from('inventory_audit_items')
      .select('id', { count: 'exact', head: true })
      .eq('audit_id', id)
      .not('discrepancy', 'is', null)
      .neq('discrepancy', 0)

    return NextResponse.json({
      audit: {
        ...audit,
        location: audit.locations,
        created_by_employee: audit.employees,
        scope_room_names: scopeRoomNames,
        scope_category_names: scopeCategoryNames,
        summary: {
          totalItems: totalItems ?? 0,
          countedItems: countedItems ?? 0,
          discrepancyItems: discrepancyItems ?? 0,
        },
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Audit detail error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params

    const perms = await getEmployeePermissions(session.employeeId)
    if (!hasPermission(perms, PERMISSIONS.ADJUST_INVENTORY)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body as { action: 'start' | 'review' | 'complete' | 'cancel' }

    if (!action || !['start', 'review', 'complete', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be: start, review, complete, or cancel' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    // Fetch current audit
    const { data: audit, error: fetchError } = await sb
      .from('inventory_audits')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    // Validate state transitions
    const validTransitions: Record<string, string[]> = {
      draft: ['start', 'cancel'],
      in_progress: ['review', 'cancel'],
      review: ['complete', 'cancel'],
    }

    const allowed = validTransitions[audit.status] ?? []
    if (!allowed.includes(action)) {
      return NextResponse.json(
        { error: `Cannot ${action} an audit in ${audit.status} status` },
        { status: 400 },
      )
    }

    // Build update payload
    const statusMap: Record<string, string> = {
      start: 'in_progress',
      review: 'review',
      complete: 'completed',
      cancel: 'cancelled',
    }

    const updatePayload: Record<string, unknown> = {
      status: statusMap[action],
    }

    if (action === 'start') {
      updatePayload.started_at = new Date().toISOString()

      // Populate audit items from current inventory matching scope
      let inventoryQuery = sb
        .from('inventory_items')
        .select('id, product_id, quantity')
        .eq('location_id', audit.location_id)
        .eq('is_active', true)
        .gt('quantity', 0)

      if (audit.scope_rooms && audit.scope_rooms.length > 0) {
        inventoryQuery = inventoryQuery.in('room_id', audit.scope_rooms)
      }

      if (audit.scope_categories && audit.scope_categories.length > 0) {
        // Get product IDs in those categories
        const { data: catProducts } = await sb
          .from('products')
          .select('id')
          .in('category_id', audit.scope_categories)

        const productIds = (catProducts ?? []).map(p => p.id)
        if (productIds.length > 0) {
          inventoryQuery = inventoryQuery.in('product_id', productIds)
        } else {
          // No products match the category filter, insert nothing
          inventoryQuery = inventoryQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      }

      const { data: inventoryItems, error: invError } = await inventoryQuery

      if (invError) {
        logger.error('Failed to fetch inventory for audit', { error: invError.message })
        return NextResponse.json({ error: 'Failed to populate audit items' }, { status: 500 })
      }

      if (inventoryItems && inventoryItems.length > 0) {
        const auditItems = inventoryItems.map(item => ({
          audit_id: id,
          inventory_item_id: item.id,
          product_id: item.product_id,
          expected_quantity: item.quantity,
        }))

        const { error: insertError } = await sb
          .from('inventory_audit_items')
          .insert(auditItems)

        if (insertError) {
          logger.error('Failed to insert audit items', { error: insertError.message })
          return NextResponse.json({ error: 'Failed to populate audit items' }, { status: 500 })
        }
      }
    }

    if (action === 'complete') {
      updatePayload.completed_at = new Date().toISOString()
    }

    const { data: updated, error: updateError } = await sb
      .from('inventory_audits')
      .update(updatePayload)
      .eq('id', id)
      .select(AUDIT_SELECT)
      .single()

    if (updateError) {
      logger.error('Audit update failed', { error: updateError.message })
      return NextResponse.json({ error: 'Failed to update audit' }, { status: 500 })
    }

    return NextResponse.json({ audit: updated })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Audit PATCH error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
