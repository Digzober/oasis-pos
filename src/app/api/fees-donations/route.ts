import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listFeesDonations, createFeeDonation, updateFeeDonation } from '@/lib/services/settingsService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { const session = await requireSession(); const lid = req.nextUrl.searchParams.get('location_id') ?? session.locationId; return NextResponse.json({ fees: await listFeesDonations(lid) }) }
  catch (err) { logger.error('Fees error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { await requireSession(); return NextResponse.json({ fee: await createFeeDonation(await req.json()) }, { status: 201 }) }
  catch (err) { logger.error('Fee create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function PATCH(req: NextRequest) {
  try { await requireSession(); const body = await req.json(); return NextResponse.json({ fee: await updateFeeDonation(body.id, body) }) }
  catch (err) { logger.error('Fee update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
