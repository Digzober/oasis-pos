import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

interface PriceHistoryEntry {
  id: string
  field_edited: string
  previous_value: string | null
  new_value: string | null
  event_timestamp: string
  employee_id: string | null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params

    const sb = await createSupabaseServerClient()

    // Verify product exists
    const { data: product, error: productError } = await sb
      .from('products')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (productError) {
      logger.error('Price history - product lookup failed', { error: productError.message, id })
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const { data: auditEntries, error: auditError } = await sb
      .from('audit_log')
      .select('id, field_edited, previous_value, new_value, created_at, employee_id')
      .eq('entity_type', 'product')
      .eq('entity_id', id)
      .in('field_edited', ['rec_price', 'med_price', 'cost_price', 'category_id'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (auditError) {
      logger.error('Price history query failed', { error: auditError.message, id })
      return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 })
    }

    const history: PriceHistoryEntry[] = (auditEntries ?? []).map(entry => ({
      id: entry.id,
      field_edited: entry.field_edited ?? '',
      previous_value: entry.previous_value ?? null,
      new_value: entry.new_value ?? null,
      event_timestamp: entry.created_at,
      employee_id: entry.employee_id ?? null,
    }))

    return NextResponse.json({ history })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Price history error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
