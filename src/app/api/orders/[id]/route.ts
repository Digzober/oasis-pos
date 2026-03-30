import { NextRequest, NextResponse } from 'next/server'
import { getOrderStatus, updateOrderStatus } from '@/lib/services/onlineOrderService'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const order = await getOrderStatus(id); return order ? NextResponse.json({ order }) : NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  catch (err) { logger.error('Order status error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const { status } = await req.json(); await updateOrderStatus(id, status); return NextResponse.json({ success: true }) }
  catch (err) { logger.error('Order update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
