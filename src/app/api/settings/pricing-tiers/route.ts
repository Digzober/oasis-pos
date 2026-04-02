import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('pricing_tiers')
      .select('id, name, multiplier, group_id')
      .eq('organization_id', session.organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      logger.error('Pricing tiers fetch error', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch pricing tiers' }, { status: 500 })
    }

    return NextResponse.json({ tiers: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Pricing tiers error', { error: String(err) })
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

    if (body.multiplier === undefined || isNaN(Number(body.multiplier)) || Number(body.multiplier) <= 0) {
      return NextResponse.json({ error: 'Multiplier is required and must be a positive number' }, { status: 400 })
    }

    if (!body.group_id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    const { data, error } = await sb
      .from('pricing_tiers')
      .insert({
        organization_id: session.organizationId,
        name: body.name.trim(),
        multiplier: Number(body.multiplier),
        group_id: body.group_id,
      })
      .select()
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'A pricing tier with this name already exists' }, { status: 409 })
      }
      logger.error('Pricing tier create error', { error: error.message })
      return NextResponse.json({ error: 'Failed to create pricing tier' }, { status: 500 })
    }

    return NextResponse.json({ tier: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Pricing tier create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
