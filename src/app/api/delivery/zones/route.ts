import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listZones, createZone } from '@/lib/services/deliveryService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { const s = await requireSession(); const lid = req.nextUrl.searchParams.get('location_id') ?? s.locationId; return NextResponse.json({ zones: await listZones(lid) }) }
  catch (err) { logger.error('Zones error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { await requireSession(); return NextResponse.json({ zone: await createZone(await req.json()) }, { status: 201 }) }
  catch (err) { logger.error('Zone create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
