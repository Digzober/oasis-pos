import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()
    const body = await request.json()

    const update: Record<string, unknown> = {}
    if (body.name !== undefined) update.name = body.name.trim()
    if (body.color !== undefined) update.color = body.color || null

    const { data, error } = await sb
      .from('tags')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Tag update error', { error: error.message, id })
      return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 })
    }

    return NextResponse.json({ tag: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Tag update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { error } = await sb
      .from('tags')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      logger.error('Tag deactivate error', { error: error.message, id })
      return NextResponse.json({ error: 'Failed to deactivate tag' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Tag deactivate error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
