import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { setLocationPrice } from '@/lib/services/productManagementService'
import { logger } from '@/lib/utils/logger'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()
    const { data } = await sb.from('location_product_prices').select('*, locations ( id, name )').eq('product_id', id)
    return NextResponse.json({ prices: data ?? [] })
  } catch (err) {
    logger.error('Price list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const body = await request.json()
    await setLocationPrice(id, body.location_id, body)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Price set error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
