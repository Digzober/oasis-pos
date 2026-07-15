import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { getOrderStatus, updateOrderStatus } from '@/lib/services/onlineOrderService'
import { logger } from '@/lib/utils/logger'
import { getSession, requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { getOrderCapability, verifyOrderCapability } from '@/lib/auth/orderCapability'

const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'completed',
    'cancelled',
  ]),
}).strict()

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const publicCapability = verifyOrderCapability(id, getOrderCapability(req)); if (!publicCapability) { const session = await getSession(); if (!session || !await assertOrgOwnership('online_orders', id, session.organizationId)) return NextResponse.json({ error: 'Not found' }, { status: 404 }) } const order = await getOrderStatus(id); return order ? NextResponse.json({ order }) : NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  catch (err) { logger.error('Order status error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    if (!await assertOrgOwnership('online_orders', id, session.organizationId)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    const parsed = UpdateOrderStatusSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 },
      )
    }
    await updateOrderStatus(id, parsed.data.status, session.organizationId)
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Order update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
