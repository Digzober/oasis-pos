import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const { data } = await sb.from('permission_groups').select('*, permission_group_permissions ( permission_id )').eq('organization_id', session.organizationId).order('name')
    return NextResponse.json({ groups: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Permission groups error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await req.json()
    const { data, error } = await sb.from('permission_groups').insert({ name: body.name, description: body.description, organization_id: session.organizationId }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ group: data }, { status: 201 })
  } catch (err) { logger.error('Group create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
