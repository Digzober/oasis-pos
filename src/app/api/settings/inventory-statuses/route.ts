import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('inventory_statuses')
      .select('*')
      .eq('organization_id', session.organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      logger.error('Inventory statuses list error', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch inventory statuses' }, { status: 500 })
    }

    return NextResponse.json({ statuses: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Inventory statuses error', { error: String(err) })
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
      .from('inventory_statuses')
      .insert({
        organization_id: session.organizationId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        color: body.color?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'An inventory status with this name already exists' }, { status: 409 })
      }
      logger.error('Inventory status create error', { error: error.message })
      return NextResponse.json({ error: 'Failed to create inventory status' }, { status: 500 })
    }

    return NextResponse.json({ status: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Inventory status create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
