import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  per_page: z.coerce.number().min(1).max(100).default(50),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id: customerId } = await params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = QuerySchema.safeParse(searchParams)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.issues }, { status: 400 })
    }

    const { page, per_page } = parsed.data
    const offset = (page - 1) * per_page
    const sb = await createSupabaseServerClient()

    const { data: entries, error, count } = await sb
      .from('loyalty_transactions')
      .select(`
        *,
        employees:created_by ( first_name, last_name ),
        transactions:transaction_id ( id, created_at, transaction_number )
      `, { count: 'exact' })
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + per_page - 1)

    if (error) {
      logger.error('Loyalty history query failed', { error: error.message, customerId })
      return NextResponse.json({ error: 'Failed to fetch loyalty history' }, { status: 500 })
    }

    const totalCount = count ?? 0
    const totalPages = Math.ceil(totalCount / per_page)

    return NextResponse.json({
      entries: entries ?? [],
      pagination: {
        page,
        per_page,
        total: totalCount,
        total_pages: totalPages,
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Loyalty history error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
