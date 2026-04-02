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

    if (body.multiplier !== undefined && (isNaN(Number(body.multiplier)) || Number(body.multiplier) <= 0)) {
      return NextResponse.json({ error: 'Multiplier must be a positive number' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.multiplier !== undefined) updates.multiplier = Number(body.multiplier)
    if (body.group_id !== undefined) updates.group_id = body.group_id || null

    const { data, error } = await sb
      .from('pricing_tiers')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .select()
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'A pricing tier with this name already exists' }, { status: 409 })
      }
      logger.error('Pricing tier update error', { error: error.message })
      return NextResponse.json({ error: 'Failed to update pricing tier' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Pricing tier not found' }, { status: 404 })
    }

    return NextResponse.json({ tier: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Pricing tier update error', { error: String(err) })
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
      .from('pricing_tiers')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', session.organizationId)

    if (error) {
      logger.error('Pricing tier deactivate error', { error: error.message })
      return NextResponse.json({ error: 'Failed to deactivate pricing tier' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Pricing tier deactivate error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
