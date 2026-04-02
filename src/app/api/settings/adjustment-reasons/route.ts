import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('adjustment_reasons')
      .select('*')
      .eq('organization_id', session.organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      logger.error('Adjustment reasons list error', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch adjustment reasons' }, { status: 500 })
    }

    return NextResponse.json({ reasons: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Adjustment reasons error', { error: String(err) })
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
      .from('adjustment_reasons')
      .insert({
        organization_id: session.organizationId,
        name: body.name.trim(),
      })
      .select()
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'An adjustment reason with this name already exists' }, { status: 409 })
      }
      logger.error('Adjustment reason create error', { error: error.message })
      return NextResponse.json({ error: 'Failed to create adjustment reason' }, { status: 500 })
    }

    return NextResponse.json({ reason: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Adjustment reason create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
