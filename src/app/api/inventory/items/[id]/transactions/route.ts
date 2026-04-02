import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession()
    const { id } = await params
    const p = request.nextUrl.searchParams
    const page = Number(p.get('page') || 1)
    const perPage = Math.min(Number(p.get('per_page') || 50), 100)
    const offset = (page - 1) * perPage

    const sb = await createSupabaseServerClient()

    const { data, count, error } = await sb
      .from('transaction_lines')
      .select(
        '*, transactions ( id, created_at, status, transaction_type, customer_id, employee_id )',
        { count: 'exact' }
      )
      .eq('inventory_item_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) {
      logger.error('Inventory transactions fetch error', { id, error: error.message })
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    return NextResponse.json({
      lines: data ?? [],
      pagination: {
        page,
        per_page: perPage,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / perPage),
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Inventory transactions error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
