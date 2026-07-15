import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { getDiscountForEdit, updateDiscount, deactivateDiscount } from '@/lib/services/discountManagementService'
import { clearDiscountCache } from '@/lib/calculations/discountLoader'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('discounts', id, session.organizationId)) return NextResponse.json({ error: 'Discount not found' }, { status: 404 }); return NextResponse.json(await getDiscountForEdit(id)) }
  catch (err) { logger.error('Discount get error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('discounts', id, session.organizationId)) return NextResponse.json({ error: 'Discount not found' }, { status: 404 }); const discount = await updateDiscount(id, await req.json()); clearDiscountCache(); return NextResponse.json({ discount }) }
  catch (err) { logger.error('Discount update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('discounts', id, session.organizationId)) return NextResponse.json({ error: 'Discount not found' }, { status: 404 }); await deactivateDiscount(id); clearDiscountCache(); return NextResponse.json({ success: true }) }
  catch (err) { logger.error('Discount delete error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
