import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listDrivers, createDriver } from '@/lib/services/deliveryService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try { const s = await requireSession(); return NextResponse.json({ drivers: await listDrivers(s.organizationId) }) }
  catch (err) { logger.error('Drivers error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { await requireSession(); return NextResponse.json({ driver: await createDriver(await req.json()) }, { status: 201 }) }
  catch (err) { logger.error('Driver create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
