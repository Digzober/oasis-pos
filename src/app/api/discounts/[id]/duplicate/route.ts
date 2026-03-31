import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { duplicateDiscount } from '@/lib/services/discountManagementService'
import { logger } from '@/lib/utils/logger'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ discount: await duplicateDiscount(id) }, { status: 201 }) }
  catch (err) { logger.error('Discount duplicate error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
