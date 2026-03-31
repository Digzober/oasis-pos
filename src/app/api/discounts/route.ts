import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listDiscounts, createDiscount } from '@/lib/services/discountManagementService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    const s = await requireSession(); const p = req.nextUrl.searchParams
    return NextResponse.json(await listDiscounts(s.organizationId, { status: p.get('status') || undefined, search: p.get('search') || undefined, page: Number(p.get('page') || 1) }))
  } catch (err) { logger.error('Discounts list error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const s = await requireSession(); const body = await req.json()
    const disc = await createDiscount(s.organizationId, body)
    return NextResponse.json({ discount: disc }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) { const a = err as { code: string; message: string; statusCode?: number }; return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 }) }
    logger.error('Discount create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
