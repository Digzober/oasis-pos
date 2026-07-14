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

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession()
    const { id } = await req.json() as { id?: string }
    if (!id) return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
    const sb = await createSupabaseServerClient()
    // Generated types lag the live is_active column already used by GET.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (sb.from('marketing_tags') as any)
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', session.organizationId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Marketing tag delete error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
