import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const p = request.nextUrl.searchParams
    const locationId = p.get('location_id') ?? session.locationId
    const page = Number(p.get('page') || 1)
    const perPage = Number(p.get('per_page') || 50)
    const offset = (page - 1) * perPage

    const sb = await createSupabaseServerClient()

    let query = sb
      .from('inventory_items')
      .select('*, products ( id, name, sku ), rooms ( id, name )', { count: 'exact' })
      .eq('location_id', locationId)
      .eq('is_active', true)

    const productId = p.get('product_id')
    const roomId = p.get('room_id')
    const search = p.get('search')

    if (productId) query = query.eq('product_id', productId)
    if (roomId) query = query.eq('room_id', roomId)
    if (search) query = query.or(`biotrack_barcode.ilike.%${search}%,lot_number.ilike.%${search}%`)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) {
      logger.error('Inventory list error', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
    }

    return NextResponse.json({
      items: data ?? [],
      pagination: { page, per_page: perPage, total: count ?? 0, total_pages: Math.ceil((count ?? 0) / perPage) },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Inventory error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
