import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

interface AnalyticsResult {
  total_units_sold: number
  total_revenue: number
  total_cost: number
  gross_margin: number
  margin_percentage: number
  avg_sale_price: number
  transaction_count: number
  last_sold_at: string | null
  period_days: number
}

const ZERO_ANALYTICS: Omit<AnalyticsResult, 'period_days'> = {
  total_units_sold: 0,
  total_revenue: 0,
  total_cost: 0,
  gross_margin: 0,
  margin_percentage: 0,
  avg_sale_price: 0,
  transaction_count: 0,
  last_sold_at: null,
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params

    const searchParams = request.nextUrl.searchParams
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10) || 30, 1), 3650)

    const sb = await createSupabaseServerClient()

    // Verify product exists
    const { data: product, error: productError } = await sb
      .from('products')
      .select('id, cost_price')
      .eq('id', id)
      .maybeSingle()

    if (productError) {
      logger.error('Product analytics - product lookup failed', { error: productError.message, id })
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffIso = cutoffDate.toISOString()

    // Query transaction_lines joined with transactions for completed sales in the period
    const { data: lines, error: linesError } = await sb
      .from('transaction_lines')
      .select(`
        quantity,
        unit_price,
        line_total,
        transaction_id,
        transactions!inner ( id, status, created_at )
      `)
      .eq('product_id', id)
      .eq('transactions.status', 'completed')
      .gte('transactions.created_at', cutoffIso)

    if (linesError) {
      logger.error('Product analytics query failed', { error: linesError.message, id })
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    if (!lines || lines.length === 0) {
      return NextResponse.json({
        analytics: { ...ZERO_ANALYTICS, period_days: days },
      })
    }

    const productCostPrice = product.cost_price ? Number(product.cost_price) : 0

    let totalUnitsSold = 0
    let totalRevenue = 0
    let totalCost = 0
    const transactionIds = new Set<string>()
    let lastSoldAt: string | null = null

    for (const line of lines) {
      const qty = Number(line.quantity) || 0
      const unitPrice = Number(line.unit_price) || 0

      totalUnitsSold += qty
      totalRevenue += qty * unitPrice
      totalCost += qty * productCostPrice
      transactionIds.add(line.transaction_id)

      const txn = line.transactions as unknown as { id: string; status: string; created_at: string }
      if (txn?.created_at) {
        if (!lastSoldAt || txn.created_at > lastSoldAt) {
          lastSoldAt = txn.created_at
        }
      }
    }

    const grossMargin = totalRevenue - totalCost
    const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0
    const avgSalePrice = totalUnitsSold > 0 ? totalRevenue / totalUnitsSold : 0

    const analytics: AnalyticsResult = {
      total_units_sold: Math.round(totalUnitsSold * 1000) / 1000,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      gross_margin: Math.round(grossMargin * 100) / 100,
      margin_percentage: Math.round(marginPercentage * 100) / 100,
      avg_sale_price: Math.round(avgSalePrice * 100) / 100,
      transaction_count: transactionIds.size,
      last_sold_at: lastSoldAt,
      period_days: days,
    }

    return NextResponse.json({ analytics })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product analytics error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
