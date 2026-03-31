import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { updateEvent } from '@/lib/services/eventService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ event: await updateEvent(id, await req.json()) }) }
  catch (err) { logger.error('Event update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
