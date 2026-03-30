import { NextRequest, NextResponse } from 'next/server'
import { cancelOrder } from '@/lib/services/onlineOrderService'
import { logger } from '@/lib/utils/logger'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; await cancelOrder(id); return NextResponse.json({ success: true }) }
  catch (err) {
    if (err && typeof err === 'object' && 'code' in err) { const a = err as { code: string; message: string; statusCode?: number }; return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 }) }
    logger.error('Order cancel error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
