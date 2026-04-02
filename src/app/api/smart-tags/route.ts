import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { validateConditions } from '@/lib/services/smartTagService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('smart_tag_rules')
      .select('*, tags(id, name, color)')
      .eq('organization_id', session.organizationId)
      .order('name')

    if (error) {
      logger.error('Smart tag rules list error', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch smart tag rules' }, { status: 500 })
    }

    return NextResponse.json({ rules: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Smart tag rules error', { error: String(err) })
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

    if (!body.tag_id) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
    }

    const conditionError = validateConditions(body.rules)
    if (conditionError) {
      return NextResponse.json({ error: conditionError }, { status: 400 })
    }

    const { data, error } = await sb
      .from('smart_tag_rules')
      .insert({
        organization_id: session.organizationId,
        name: body.name.trim(),
        tag_id: body.tag_id,
        rules: body.rules,
        is_active: true,
      })
      .select('*, tags(id, name, color)')
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'A smart tag rule with this name already exists' }, { status: 409 })
      }
      logger.error('Smart tag rule create error', { error: error.message })
      return NextResponse.json({ error: 'Failed to create smart tag rule' }, { status: 500 })
    }

    return NextResponse.json({ rule: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Smart tag rule create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
