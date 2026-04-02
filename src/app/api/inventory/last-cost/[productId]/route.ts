import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await requireSession()
    const { productId } = await params

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb.from('inventory_items') as any)
      .select('cost_per_unit, received_at')
      .eq('product_id', productId)
      .eq('location_id', session.locationId)
      .not('cost_per_unit', 'is', null)
      .order('received_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is a valid case
      logger.error('Last cost lookup failed', { error: error.message, productId })
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    return NextResponse.json({
      cost_per_unit: data?.cost_per_unit ?? null,
      received_at: data?.received_at ?? null,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Last cost error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
