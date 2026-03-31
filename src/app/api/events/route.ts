import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listEvents, createEvent } from '@/lib/services/eventService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { const s = await requireSession(); return NextResponse.json({ events: await listEvents(s.organizationId, { status: req.nextUrl.searchParams.get('status') || undefined }) }) }
  catch (err) { logger.error('Events error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { const s = await requireSession(); return NextResponse.json({ event: await createEvent({ ...(await req.json()), organization_id: s.organizationId }) }, { status: 201 }) }
  catch (err) {
    if (err && typeof err === 'object' && 'code' in err) { const a = err as { code: string; message: string; statusCode?: number }; return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 }) }
    logger.error('Event create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
