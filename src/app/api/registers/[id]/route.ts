import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { updateRegister, deactivateRegister } from '@/lib/services/settingsService'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { data: register } = await sb
      .from('registers')
      .select('*')
      .eq('id', id)
      .single()

    if (!register) {
      return NextResponse.json({ error: 'Register not found' }, { status: 404 })
    }

    // Find open drawer for this register
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: openDrawer } = await (sb.from('cash_drawers') as any)
      .select('id, status, opening_amount, opened_at, opened_by')
      .eq('register_id', id)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ register, open_drawer: openDrawer ?? null })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Register fetch error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ register: await updateRegister(id, await req.json()) }) }
  catch (err) { logger.error('Register update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; await deactivateRegister(id); return NextResponse.json({ success: true }) }
  catch (err) { logger.error('Register delete error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
