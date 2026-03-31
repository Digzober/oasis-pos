import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { updateSegment } from '@/lib/services/segmentService'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; const sb = await createSupabaseServerClient(); const { data } = await sb.from('segments').select('*').eq('id', id).single(); return NextResponse.json({ segment: data }) }
  catch (err) { logger.error('Segment get error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ segment: await updateSegment(id, await req.json()) }) }
  catch (err) { logger.error('Segment update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
