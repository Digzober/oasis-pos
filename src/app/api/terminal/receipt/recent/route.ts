import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    await requireSession()
    const registerId = request.nextUrl.searchParams.get('register_id')

    if (!registerId) {
      return NextResponse.json({ error: 'register_id is required' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    const { data: transactions, error } = await (sb as any)
      .from('transactions')
      .select('id, receipt_number, created_at, total, customer_id')
      .eq('register_id', registerId)
      .in('status', ['completed', 'closed'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      logger.error('Recent receipts query error', { error: String(error) })
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    const customerIds = (transactions ?? [])
      .map((t: any) => t.customer_id)
      .filter(Boolean)

    let customerMap: Record<string, string> = {}
    if (customerIds.length > 0) {
      const { data: customers } = await (sb as any)
        .from('customers')
        .select('id, first_name, last_name')
        .in('id', customerIds)

      if (customers) {
        for (const c of customers) {
          customerMap[c.id] = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Walk-in'
        }
      }
    }

    const result = (transactions ?? []).map((t: any) => ({
      id: t.id,
      receipt_number: t.receipt_number,
      created_at: t.created_at,
      total: Number(t.total),
      customer_name: t.customer_id ? (customerMap[t.customer_id] ?? 'Walk-in') : 'Walk-in',
    }))

    return NextResponse.json({ transactions: result })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Recent receipts API error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
