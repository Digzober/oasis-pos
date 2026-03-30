import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getTransactionLog } from '@/lib/services/reportingService'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    await requireSession()
    const p = request.nextUrl.searchParams

    const today = new Date().toISOString().split('T')[0]!

    const result = await getTransactionLog({
      location_id: p.get('location_id') || null,
      employee_id: p.get('employee_id') || null,
      register_id: p.get('register_id') || null,
      date_from: p.get('date_from') || today,
      date_to: p.get('date_to') || today,
      transaction_type: p.get('transaction_type') || null,
      status: p.get('status') || null,
      min_amount: p.get('min_amount') ? Number(p.get('min_amount')) : null,
      max_amount: p.get('max_amount') ? Number(p.get('max_amount')) : null,
      customer_id: p.get('customer_id') || null,
      page: Number(p.get('page') || 1),
      per_page: Number(p.get('per_page') || 50),
    })

    return NextResponse.json(result)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Transaction log API error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
