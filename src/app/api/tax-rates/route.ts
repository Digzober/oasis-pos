import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listTaxRates, createTaxRate } from '@/lib/services/settingsService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { const session = await requireSession(); const lid = req.nextUrl.searchParams.get('location_id') ?? session.locationId; return NextResponse.json({ tax_rates: await listTaxRates(lid) }) }
  catch (err) { logger.error('Tax rates error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { await requireSession(); return NextResponse.json({ tax_rate: await createTaxRate(await req.json()) }, { status: 201 }) }
  catch (err) { logger.error('Tax rate create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
