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

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()

    const params = request.nextUrl.searchParams
    const status = params.get('status')
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '25', 10)))
    const offset = (page - 1) * limit

    const sb = await createSupabaseServerClient()

    let query = sb
      .from('inventory_audits')
      .select(AUDIT_SELECT, { count: 'exact' })
      .eq('organization_id', session.organizationId)
      .eq('location_id', session.locationId)

    if (status) {
      query = query.eq('status', status)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: audits, count, error } = await query

    if (error) {
      logger.error('Audit list query failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch audits' }, { status: 500 })
    }

    const total = count ?? 0

    // Resolve scope names for display
    const allRoomIds = new Set<string>()
    const allCategoryIds = new Set<string>()
    for (const audit of audits ?? []) {
      for (const rid of audit.scope_rooms ?? []) allRoomIds.add(rid)
      for (const cid of audit.scope_categories ?? []) allCategoryIds.add(cid)
    }

    let roomMap: Record<string, string> = {}
    let categoryMap: Record<string, string> = {}

    if (allRoomIds.size > 0) {
      const { data: rooms } = await sb
        .from('rooms')
        .select('id, name')
        .in('id', Array.from(allRoomIds))
      for (const r of rooms ?? []) roomMap[r.id] = r.name
    }

    if (allCategoryIds.size > 0) {
      const { data: cats } = await sb
        .from('product_categories')
        .select('id, name')
        .in('id', Array.from(allCategoryIds))
      for (const c of cats ?? []) categoryMap[c.id] = c.name
    }

    return NextResponse.json({
      audits: (audits ?? []).map(a => ({
        ...a,
        location: a.locations,
        created_by_employee: a.employees,
        scope_room_names: (a.scope_rooms ?? []).map((rid: string) => roomMap[rid] ?? rid),
        scope_category_names: (a.scope_categories ?? []).map((cid: string) => categoryMap[cid] ?? cid),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Audit list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()

    const perms = await getEmployeePermissions(session.employeeId)
    if (!hasPermission(perms, PERMISSIONS.ADJUST_INVENTORY)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, notes, scopeRooms, scopeCategories } = body as {
      name?: string
      notes?: string
      scopeRooms?: string[]
      scopeCategories?: string[]
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Audit name is required' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    const { data: audit, error } = await sb
      .from('inventory_audits')
      .insert({
        organization_id: session.organizationId,
        location_id: session.locationId,
        name: name.trim(),
        notes: notes?.trim() || null,
        status: 'draft',
        scope_rooms: scopeRooms && scopeRooms.length > 0 ? scopeRooms : null,
        scope_categories: scopeCategories && scopeCategories.length > 0 ? scopeCategories : null,
        created_by: session.employeeId,
      })
      .select(AUDIT_SELECT)
      .single()

    if (error) {
      logger.error('Audit create failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to create audit' }, { status: 500 })
    }

    return NextResponse.json({ audit }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Audit create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
