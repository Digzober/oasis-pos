import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { flattenReceiptConfig, getReceiptConfig } from '@/lib/receipts/config'
import { roundMoney } from '@/lib/utils/money'
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
      .select('id, transaction_number, created_at, subtotal, discount_amount, tax_amount, total, customer_id, employee_id, location_id, biotrack_transaction_id')
      .eq('id', transactionId)
      .single()

    if (txnErr || !txn) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const [linesRes, paymentsRes, taxesRes, discountsRes, locationRes, employeeRes] = await Promise.all([
      (sb as any)
        .from('transaction_lines')
        .select('product_name, quantity, unit_price, line_total, discount_amount, biotrack_barcode, products ( sku, thc_percentage )')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true }),
      (sb as any)
        .from('transaction_payments')
        .select('payment_method, amount, change_given')
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
        .select('name, address_line1, address_line2, city, state, zip, phone, license_number')
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
    const receiptConfig = flattenReceiptConfig(await getReceiptConfig(txn.location_id))
    const location = locationRes.data
    const addressParts = location
      ? [location.address_line1, location.address_line2, `${location.city}, ${location.state} ${location.zip}`]
      : []
    const unroundedTotal = roundMoney(
      Number(txn.subtotal) - Number(txn.discount_amount ?? 0) + Number(txn.tax_amount),
    )

    const receipt = {
      transaction_id: txn.id,
      receipt_number: String(txn.transaction_number),
      date: txn.created_at,
      location_name: location?.name ?? 'Unknown',
      location_address: addressParts.filter(Boolean).join(', '),
      location_phone: location?.phone ?? null,
      license_number: location?.license_number ?? '',
      employee_name: employeeName,
      customer_name: customerName,
      lines: (linesRes.data ?? []).map((l: any) => ({
        product_name: l.product_name,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        line_total: Number(l.line_total),
        discount_amount: Number(l.discount_amount ?? 0),
        sku: l.products?.sku ?? null,
        thc_percentage: l.products?.thc_percentage == null ? null : Number(l.products.thc_percentage),
        biotrack_barcode: l.biotrack_barcode ?? null,
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
        change: Number(p.change_given ?? 0),
      })),
      subtotal: Number(txn.subtotal),
      discount_total: Number(txn.discount_amount ?? 0),
      tax_total: Number(txn.tax_amount),
      rounding_adjustment: roundMoney(Number(txn.total) - unroundedTotal),
      total: Number(txn.total),
      loyalty_points_earned: null,
      biotrack_transaction_id: txn.biotrack_transaction_id,
      config: receiptConfig,
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
