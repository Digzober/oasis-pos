import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { updateRoom } from '@/lib/services/settingsService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('rooms', id, session.organizationId, undefined, session.locationId)) return NextResponse.json({ error: 'Room not found' }, { status: 404 }); return NextResponse.json({ room: await updateRoom(id, await req.json()) }) }
  catch (err) { logger.error('Room update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
