import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(); const { id } = await params
    const sb = await createSupabaseServerClient()
    const { data } = await sb.from('permission_groups').select('*, permission_group_permissions ( permission_id, permission_definitions ( id, category, code, name, sub_category ) )').eq('id', id).single()
    return NextResponse.json({ group: data })
  } catch (err) { logger.error('Group get error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(); const { id } = await params; const body = await req.json()
    const sb = await createSupabaseServerClient()
    const { data } = await sb.from('permission_groups').update({ name: body.name, description: body.description }).eq('id', id).select().single()
    return NextResponse.json({ group: data })
  } catch (err) { logger.error('Group update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(); const { id } = await params; const body = await req.json()
    const sb = await createSupabaseServerClient()
    // Atomic: delete old, insert new
    await sb.from('permission_group_permissions').delete().eq('permission_group_id', id)
    if (body.permission_ids?.length > 0) {
      await sb.from('permission_group_permissions').insert(body.permission_ids.map((pid: string) => ({ permission_group_id: id, permission_id: pid })))
    }
    return NextResponse.json({ success: true })
  } catch (err) { logger.error('Group permissions update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
