import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getEmployeePermissions, hasPermission } from '@/lib/services/permissionService'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

const ITEM_SELECT = `
  *,
  products ( id, name, sku ),
  inventory_items ( id, barcode, batch_id, room_id, rooms:room_id ( id, name ) ),
  employees!inventory_audit_items_counted_by_fkey ( id, first_name, last_name )
`

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
    const offset = (page - 1) * limit
    const filter = searchParams.get('filter') // 'all' | 'counted' | 'uncounted' | 'discrepancy'
    const search = searchParams.get('search')

    const sb = await createSupabaseServerClient()

    // Verify audit exists
    const { data: audit, error: auditError } = await sb
      .from('inventory_audits')
      .select('id, status')
      .eq('id', id)
      .single()

    if (auditError || !audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    let query = sb
      .from('inventory_audit_items')
      .select(ITEM_SELECT, { count: 'exact' })
      .eq('audit_id', id)

    if (filter === 'counted') {
      query = query.not('counted_quantity', 'is', null)
    } else if (filter === 'uncounted') {
      query = query.is('counted_quantity', null)
    } else if (filter === 'discrepancy') {
      query = query.not('discrepancy', 'is', null).neq('discrepancy', 0)
    }

    query = query
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: items, count, error } = await query

    if (error) {
      logger.error('Audit items query failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch audit items' }, { status: 500 })
    }

    let resultItems = items ?? []

    // Client-side search filter on product name/sku (Supabase can't filter on joined fields easily)
    if (search && search.trim().length > 0) {
      const term = search.toLowerCase()
      resultItems = resultItems.filter((item) => {
        const product = item.products as { name: string; sku: string | null } | null
        if (!product) return false
        return (
          product.name.toLowerCase().includes(term) ||
          (product.sku && product.sku.toLowerCase().includes(term))
        )
      })
    }

    return NextResponse.json({
      items: resultItems,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Audit items list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(
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
    const { itemId, countedQuantity, notes } = body as {
      itemId: string
      countedQuantity: number
      notes?: string
    }

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }
    if (countedQuantity == null || countedQuantity < 0) {
      return NextResponse.json({ error: 'countedQuantity must be a non-negative number' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    // Verify audit is in countable state
    const { data: audit, error: auditError } = await sb
      .from('inventory_audits')
      .select('id, status')
      .eq('id', id)
      .single()

    if (auditError || !audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }

    if (audit.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Can only record counts for audits in in_progress status' },
        { status: 400 },
      )
    }

    // Fetch the audit item to calculate discrepancy
    const { data: auditItem, error: itemError } = await sb
      .from('inventory_audit_items')
      .select('id, expected_quantity')
      .eq('id', itemId)
      .eq('audit_id', id)
      .single()

    if (itemError || !auditItem) {
      return NextResponse.json({ error: 'Audit item not found' }, { status: 404 })
    }

    const discrepancy = countedQuantity - auditItem.expected_quantity

    const { data: updated, error: updateError } = await sb
      .from('inventory_audit_items')
      .update({
        counted_quantity: countedQuantity,
        discrepancy,
        counted_by: session.employeeId,
        counted_at: new Date().toISOString(),
        notes: notes?.trim() || null,
      })
      .eq('id', itemId)
      .select(ITEM_SELECT)
      .single()

    if (updateError) {
      logger.error('Audit item count update failed', { error: updateError.message })
      return NextResponse.json({ error: 'Failed to record count' }, { status: 500 })
    }

    return NextResponse.json({ item: updated })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Audit item count error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
