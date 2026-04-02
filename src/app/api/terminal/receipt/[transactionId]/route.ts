import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    await requireSession()
    const { transactionId } = await params
    const sb = await createSupabaseServerClient()

    const { data: txn, error: txnErr } = await (sb as any)
      .from('transactions')
      .select('id, receipt_number, created_at, subtotal, discount_total, tax_total, total, customer_id, employee_id, location_id')
      .eq('id', transactionId)
      .single()

    if (txnErr || !txn) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const [linesRes, paymentsRes, taxesRes, discountsRes, locationRes, employeeRes] = await Promise.all([
      (sb as any)
        .from('transaction_lines')
        .select('product_name, quantity, unit_price, line_total, discount_amount')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true }),
      (sb as any)
        .from('transaction_payments')
        .select('payment_method, amount, change_amount')
        .eq('transaction_id', transactionId),
      (sb as any)
        .from('transaction_taxes')
        .select('tax_name, tax_rate, tax_amount')
        .eq('transaction_id', transactionId),
      (sb as any)
        .from('transaction_discounts')
        .select('discount_name, discount_amount')
        .eq('transaction_id', transactionId),
      (sb as any)
        .from('locations')
        .select('name')
        .eq('id', txn.location_id)
        .single(),
      (sb as any)
        .from('employees')
        .select('first_name, last_name')
        .eq('id', txn.employee_id)
        .single(),
    ])

    let customerName: string | null = null
    if (txn.customer_id) {
      const { data: cust } = await (sb as any)
        .from('customers')
        .select('first_name, last_name')
        .eq('id', txn.customer_id)
        .single()
      if (cust) {
        customerName = `${cust.first_name ?? ''} ${cust.last_name ?? ''}`.trim() || null
      }
    }

    const employeeName = employeeRes.data
      ? `${employeeRes.data.first_name ?? ''} ${employeeRes.data.last_name ?? ''}`.trim()
      : 'Unknown'

    const receipt = {
      transaction_id: txn.id,
      receipt_number: txn.receipt_number,
      date: txn.created_at,
      location_name: locationRes.data?.name ?? 'Unknown',
      employee_name: employeeName,
      customer_name: customerName,
      lines: (linesRes.data ?? []).map((l: any) => ({
        product_name: l.product_name,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        line_total: Number(l.line_total),
        discount_amount: Number(l.discount_amount ?? 0),
      })),
      discounts: (discountsRes.data ?? []).map((d: any) => ({
        name: d.discount_name,
        amount: Number(d.discount_amount),
      })),
      taxes: (taxesRes.data ?? []).map((t: any) => ({
        name: t.tax_name,
        rate: Number(t.tax_rate),
        amount: Number(t.tax_amount),
      })),
      payments: (paymentsRes.data ?? []).map((p: any) => ({
        method: p.payment_method,
        amount: Number(p.amount),
        change: Number(p.change_amount ?? 0),
      })),
      subtotal: Number(txn.subtotal),
      discount_total: Number(txn.discount_total ?? 0),
      tax_total: Number(txn.tax_total),
      total: Number(txn.total),
    }

    return NextResponse.json({ receipt })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Receipt detail API error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
