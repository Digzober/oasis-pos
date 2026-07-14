import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { duplicateDiscount } from '@/lib/services/discountManagementService'
import { logger } from '@/lib/utils/logger'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('discounts', id, session.organizationId)) return NextResponse.json({ error: 'Discount not found' }, { status: 404 }); return NextResponse.json({ discount: await duplicateDiscount(id) }, { status: 201 }) }
  catch (err) { logger.error('Discount duplicate error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
