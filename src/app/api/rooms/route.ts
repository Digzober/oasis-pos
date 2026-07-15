import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listRooms, createRoom, createSubroom } from '@/lib/services/settingsService'
import { withAccessibleLocation } from '@/lib/settings/entityScope'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { const session = await requireSession(); const lid = req.nextUrl.searchParams.get('location_id') ?? session.locationId; return NextResponse.json({ rooms: await listRooms(lid) }) }
  catch (err) { logger.error('Rooms error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { const session = await requireSession(); const body = await req.json() as Record<string, unknown>
    if (body.room_id) return NextResponse.json({ subroom: await createSubroom(body as Parameters<typeof createSubroom>[0]) }, { status: 201 })
    const input = await withAccessibleLocation(
      session,
      body as Omit<Parameters<typeof createRoom>[0], 'location_id'> & { location_id?: string },
    )
    return NextResponse.json({ room: await createRoom(input) }, { status: 201 })
  } catch (err) { logger.error('Room create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
