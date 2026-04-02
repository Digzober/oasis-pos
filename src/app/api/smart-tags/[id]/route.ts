import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { validateConditions } from '@/lib/services/smartTagService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()
    const body = await request.json()

    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      updates.name = body.name.trim()
    }

    if (body.tag_id !== undefined) {
      if (!body.tag_id) {
        return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
      }
      updates.tag_id = body.tag_id
    }

    if (body.rules !== undefined) {
      const conditionError = validateConditions(body.rules)
      if (conditionError) {
        return NextResponse.json({ error: conditionError }, { status: 400 })
      }
      updates.rules = body.rules
    }

    if (body.is_active !== undefined) {
      updates.is_active = body.is_active
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data, error } = await sb
      .from('smart_tag_rules')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .select('*, tags(id, name, color)')
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'A smart tag rule with this name already exists' }, { status: 409 })
      }
      logger.error('Smart tag rule update error', { error: error.message, id })
      return NextResponse.json({ error: 'Failed to update smart tag rule' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Smart tag rule not found' }, { status: 404 })
    }

    return NextResponse.json({ rule: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Smart tag rule update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('smart_tag_rules')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .select('id')
      .single()

    if (error) {
      logger.error('Smart tag rule deactivate error', { error: error.message, id })
      return NextResponse.json({ error: 'Failed to deactivate smart tag rule' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Smart tag rule not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Smart tag rule deactivate error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
