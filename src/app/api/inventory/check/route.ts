import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CheckSchema = z.object({
  productId: z.uuid(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()

    const params = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = CheckSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'productId is required and must be a valid UUID' },
        { status: 400 },
      )
    }

    const { productId } = parsed.data
    const sb = await createSupabaseServerClient()

    const { data: items, error } = await sb
      .from('inventory_items')
      .select(`
        id, biotrack_barcode, quantity, quantity_reserved,
        batch_id, expiration_date, lot_number,
        rooms ( name )
      `)
      .eq('product_id', productId)
      .eq('location_id', session.locationId)
      .eq('is_active', true)
      .gt('quantity', 0)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Inventory check failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to check inventory' }, { status: 500 })
    }

    const rows = items ?? []
    let available = 0
    let reserved = 0

    const formatted = rows.map((item) => {
      const qty = item.quantity - item.quantity_reserved
      available += qty
      reserved += item.quantity_reserved
      return {
        id: item.id,
        biotrack_barcode: item.biotrack_barcode,
        quantity: qty,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        room_name: (item.rooms as any)?.name ?? null,
        batch_id: item.batch_id,
        lot_number: item.lot_number,
        expiration_date: item.expiration_date,
      }
    })

    return NextResponse.json({
      available,
      reserved,
      items: formatted,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Inventory check error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
