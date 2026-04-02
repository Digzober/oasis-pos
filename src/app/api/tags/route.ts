import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '100', 10)))
    const includeInactive = url.searchParams.get('includeInactive') === 'true'

    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = sb
      .from('tags')
      .select('*', { count: 'exact' })
      .eq('organization_id', session.organizationId)
      .eq('tag_type', 'product')
      .order('name')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logger.error('Tags list error', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
    }

    return NextResponse.json({
      tags: data ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Tags error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data, error } = await sb
      .from('tags')
      .insert({
        organization_id: session.organizationId,
        name: body.name.trim(),
        tag_type: 'product',
        color: body.color || null,
      })
      .select()
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 })
      }
      logger.error('Tag create error', { error: error.message })
      return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
    }

    return NextResponse.json({ tag: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Tag create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
