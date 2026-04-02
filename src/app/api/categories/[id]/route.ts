import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('product_categories')
      .select('*, parent:product_categories!parent_id ( id, name, slug )')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ category: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Category fetch error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const body = await req.json()
    const sb = await createSupabaseServerClient()

    const updates: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'slug', 'description', 'sort_order', 'parent_id',
      'master_category', 'purchase_limit_category', 'tax_category',
      'regulatory_category', 'available_for', 'icon_url', 'is_active',
    ]

    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await sb
      .from('product_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Category update error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ category: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Category update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    // Check for active products using this category
    const { count } = await sb
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_active', true)

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot deactivate: ${count} active product(s) use this category` },
        { status: 409 },
      )
    }

    const { error } = await sb
      .from('product_categories')
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('Category deactivate error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Category delete error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
