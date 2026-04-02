import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

function generatePoNumber(existingMax: string | null): string {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `PO-${dateStr}-`

  if (existingMax && existingMax.startsWith(prefix)) {
    const seq = parseInt(existingMax.slice(prefix.length), 10)
    return `${prefix}${String(seq + 1).padStart(3, '0')}`
  }
  return `${prefix}001`
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const p = request.nextUrl.searchParams
    const page = Math.max(1, Number(p.get('page') || 1))
    const perPage = Math.min(100, Math.max(1, Number(p.get('per_page') || 50)))
    const offset = (page - 1) * perPage
    const tab = p.get('tab') || 'active'
    const search = p.get('search') || ''

    const sb = await createSupabaseServerClient()

    let query = sb
      .from('purchase_orders')
      .select(
        '*, vendors ( id, name ), locations ( id, name ), employees:created_by ( id, first_name, last_name ), purchase_order_lines ( id )',
        { count: 'exact' }
      )
      .eq('organization_id', session.organizationId)

    if (tab === 'received') {
      query = query.in('status', ['partial', 'received'])
    } else {
      query = query.in('status', ['draft', 'submitted'])
    }

    if (search) {
      query = query.or(`po_number.ilike.%${search}%,vendors.name.ilike.%${search}%`)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) {
      logger.error('PO list error', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = (data ?? []).map((po: any) => ({
      id: po.id,
      po_number: po.po_number,
      status: po.status,
      vendor_name: po.vendors?.name ?? null,
      location_name: po.locations?.name ?? null,
      created_by_name: po.employees ? `${po.employees.first_name} ${po.employees.last_name}` : null,
      total_cost: po.total_cost,
      expected_delivery_date: po.expected_delivery_date,
      created_at: po.created_at,
      submitted_at: po.submitted_at,
      line_count: po.purchase_order_lines?.length ?? 0,
      notes: po.notes,
    }))

    return NextResponse.json({
      orders,
      pagination: { page, per_page: perPage, total: count ?? 0, total_pages: Math.ceil((count ?? 0) / perPage) },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('PO list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const sb = await createSupabaseServerClient()

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `PO-${today}-`

    const { data: maxRow } = await sb
      .from('purchase_orders')
      .select('po_number')
      .like('po_number', `${prefix}%`)
      .order('po_number', { ascending: false })
      .limit(1)
      .single()

    const poNumber = generatePoNumber(maxRow?.po_number ?? null)

    const { data: po, error } = await sb
      .from('purchase_orders')
      .insert({
        organization_id: session.organizationId,
        location_id: body.location_id || session.locationId,
        vendor_id: body.vendor_id || null,
        po_number: poNumber,
        status: 'draft',
        expected_delivery_date: body.expected_delivery_date || null,
        notes: body.notes || null,
        created_by: session.employeeId,
        total_cost: 0,
      })
      .select()
      .single()

    if (error) {
      logger.error('PO create error', { error: error.message })
      return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
    }

    return NextResponse.json({ purchase_order: po }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('PO create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
