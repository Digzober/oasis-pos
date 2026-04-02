import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const params = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '25', 10)))
    const search = params.get('search') ?? ''
    const offset = (page - 1) * limit

    const sb = await createSupabaseServerClient()

    let query = sb
      .from('product_kits')
      .select('*, product_kit_items(count)', { count: 'exact' })
      .eq('organization_id', session.organizationId)
      .eq('is_active', true)

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    query = query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: kits, count, error } = await query

    if (error) {
      logger.error('Product kits list query failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch product kits' }, { status: 500 })
    }

    const total = count ?? 0

    const formatted = (kits ?? []).map((kit) => ({
      ...kit,
      item_count: Array.isArray(kit.product_kit_items)
        ? kit.product_kit_items.length
        : (kit.product_kit_items as { count: number })?.count ?? 0,
      product_kit_items: undefined,
    }))

    return NextResponse.json({
      kits: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product kits list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()

    const { name, description, sku, price } = body as {
      name?: string
      description?: string
      sku?: string
      price?: number
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    const { data: kit, error } = await sb
      .from('product_kits')
      .insert({
        organization_id: session.organizationId,
        name: name.trim(),
        description: description?.trim() ?? null,
        sku: sku?.trim() ?? null,
        price: price ?? null,
        is_active: true,
      })
      .select('*')
      .single()

    if (error) {
      logger.error('Product kit create failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to create product kit' }, { status: 500 })
    }

    return NextResponse.json({ kit }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product kit create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
