import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const s = await requireSession(); const sb = await createSupabaseServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (sb.from('marketing_tags') as any).select('*').eq('organization_id', s.organizationId).eq('is_active', true).order('name')
    return NextResponse.json({ tags: data ?? [] })
  } catch (err) { logger.error('Marketing tags error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try {
    const s = await requireSession(); const sb = await createSupabaseServerClient(); const body = await req.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb.from('marketing_tags') as any).insert({ ...body, organization_id: s.organizationId }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tag: data }, { status: 201 })
  } catch (err) { logger.error('Marketing tag create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
