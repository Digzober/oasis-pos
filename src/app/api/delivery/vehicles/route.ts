import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listVehicles, createVehicle } from '@/lib/services/deliveryService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { const s = await requireSession(); const lid = req.nextUrl.searchParams.get('location_id') ?? s.locationId; return NextResponse.json({ vehicles: await listVehicles(lid) }) }
  catch (err) { logger.error('Vehicles error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { await requireSession(); return NextResponse.json({ vehicle: await createVehicle(await req.json()) }, { status: 201 }) }
  catch (err) { logger.error('Vehicle create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
