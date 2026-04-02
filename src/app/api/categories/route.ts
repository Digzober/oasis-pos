import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    await requireSession()
    const sb = await createSupabaseServerClient()

    const { data: categories, error } = await sb
      .from('product_categories')
      .select('*, parent:product_categories!parent_id ( id, name, slug )')
      .eq('is_active', true)
      .order('sort_order')
      .order('name')

    if (error) {
      logger.error('Categories query failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    return NextResponse.json({ categories: categories ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Categories error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!body.tax_category?.trim()) {
      return NextResponse.json({ error: 'Tax category is required' }, { status: 400 })
    }
    if (!body.available_for?.trim()) {
      return NextResponse.json({ error: 'Available for is required' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()
    const slug = body.slug?.trim() || slugify(body.name)

    // Check slug uniqueness within org
    const { data: existing } = await sb
      .from('product_categories')
      .select('id')
      .eq('organization_id', session.organizationId)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 })
    }

    // Get max sort_order if not provided
    let sortOrder = body.sort_order
    if (sortOrder == null) {
      const { data: maxRow } = await sb
        .from('product_categories')
        .select('sort_order')
        .eq('organization_id', session.organizationId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      sortOrder = (maxRow?.sort_order ?? 0) + 1
    }

    const { data, error } = await sb
      .from('product_categories')
      .insert({
        organization_id: session.organizationId,
        name: body.name.trim(),
        slug,
        description: body.description?.trim() || null,
        sort_order: sortOrder,
        parent_id: body.parent_id || null,
        master_category: body.master_category?.trim() || null,
        purchase_limit_category: body.purchase_limit_category || null,
        tax_category: body.tax_category.trim(),
        regulatory_category: body.regulatory_category?.trim() || null,
        available_for: body.available_for,
      })
      .select()
      .single()

    if (error) {
      logger.error('Category create error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Category create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
