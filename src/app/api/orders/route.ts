import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { placeOrder } from '@/lib/services/onlineOrderService'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const PlaceOrderSchema = z.object({
  location_id: z.uuid(),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(7),
  customer_email: z.email().nullable().optional(),
  pickup_time: z.string(),
  items: z.array(z.object({ product_id: z.uuid(), quantity: z.number().int().positive() })).min(1),
  notes: z.string().nullable().optional(),
  order_type: z.literal('pickup').default('pickup'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = PlaceOrderSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })

    const order = await placeOrder({ ...parsed.data, customer_email: parsed.data.customer_email ?? null, notes: parsed.data.notes ?? null })
    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      return NextResponse.json({ error: a.message, code: a.code }, { status: a.statusCode ?? 500 })
    }
    logger.error('Order place error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams
    const sb = await createSupabaseServerClient()
    const locationId = p.get('location_id')
    const status = p.get('status')

    let query = sb.from('online_orders').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(50)
    if (locationId) query = query.eq('location_id', locationId)
    if (status) query = query.eq('status', status)

    const { data, count } = await query
    return NextResponse.json({ orders: data ?? [], total: count ?? 0 })
  } catch (err) {
    logger.error('Orders list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
