import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listRegisters, createRegister } from '@/lib/services/settingsService'
import { withAccessibleLocation } from '@/lib/settings/entityScope'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { const session = await requireSession(); const lid = req.nextUrl.searchParams.get('location_id') ?? session.locationId; return NextResponse.json({ registers: await listRegisters(lid) }) }
  catch (err) { logger.error('Registers error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { const session = await requireSession(); const body = await req.json() as Omit<Parameters<typeof createRegister>[0], 'location_id'> & { location_id?: string }; const input = await withAccessibleLocation(session, body); return NextResponse.json({ register: await createRegister(input) }, { status: 201 }) }
  catch (err) { logger.error('Register create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
