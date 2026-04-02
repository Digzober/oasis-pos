import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { data } = await sb
      .from('product_tags')
      .select('tag_id, tags ( id, name, color )')
      .eq('product_id', id)

    const tags = (data ?? []).map((pt: { tags: unknown }) => pt.tags)
    return NextResponse.json({ tags })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product tags error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const tagIds: string[] = body.tag_ids ?? []

    // Remove existing tags
    await sb.from('product_tags').delete().eq('product_id', id)

    // Insert new tags
    if (tagIds.length > 0) {
      const { error } = await sb
        .from('product_tags')
        .insert(tagIds.map(tag_id => ({ product_id: id, tag_id })))

      if (error) {
        logger.error('Product tags update error', { error: error.message, id })
        return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product tags update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
