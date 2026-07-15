import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { updateTaxRate, deactivateTaxRate } from '@/lib/services/settingsService'
import { clearTaxRateCache } from '@/lib/calculations/taxRateLoader'
import { logger } from '@/lib/utils/logger'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('tax_rates', id, session.organizationId, undefined, session.locationId)) return NextResponse.json({ error: 'Tax rate not found' }, { status: 404 }); const taxRate = await updateTaxRate(id, await req.json()); clearTaxRateCache(); return NextResponse.json({ tax_rate: taxRate }) }
  catch (err) { logger.error('Tax rate update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('tax_rates', id, session.organizationId, undefined, session.locationId)) return NextResponse.json({ error: 'Tax rate not found' }, { status: 404 }); await deactivateTaxRate(id); clearTaxRateCache(); return NextResponse.json({ success: true }) }
  catch (err) { logger.error('Tax rate delete error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
