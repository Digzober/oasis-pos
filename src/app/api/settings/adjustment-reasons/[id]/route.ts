import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const { id } = await params
    const body = await request.json()

    if (body.name !== undefined && !body.name?.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name.trim()

    const { data, error } = await sb
      .from('adjustment_reasons')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .select()
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'An adjustment reason with this name already exists' }, { status: 409 })
      }
      logger.error('Adjustment reason update error', { error: error.message })
      return NextResponse.json({ error: 'Failed to update adjustment reason' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Adjustment reason not found' }, { status: 404 })
    }

    return NextResponse.json({ reason: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Adjustment reason update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const { id } = await params

    const { error } = await sb
      .from('adjustment_reasons')
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', session.organizationId)

    if (error) {
      logger.error('Adjustment reason deactivate error', { error: error.message })
      return NextResponse.json({ error: 'Failed to deactivate adjustment reason' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Adjustment reason deactivate error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
