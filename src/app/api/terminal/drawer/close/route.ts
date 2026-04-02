import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CLOSE_ROLES = ['shift_lead', 'manager', 'admin', 'owner']

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()

    if (!CLOSE_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only shift leads and above can close drawers.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { cash_drawer_id, actual_cash, notes } = body as {
      cash_drawer_id: string
      actual_cash: number
      notes?: string
    }

    if (!cash_drawer_id || actual_cash === undefined || actual_cash === null) {
      return NextResponse.json(
        { error: 'cash_drawer_id and actual_cash are required' },
        { status: 400 }
      )
    }

    if (typeof actual_cash !== 'number' || actual_cash < 0) {
      return NextResponse.json(
        { error: 'actual_cash must be a non-negative number' },
        { status: 400 }
      )
    }

    const sb = await createSupabaseServerClient()

    // Fetch the drawer and verify it is open
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: drawer, error: drawerError } = await (sb.from('cash_drawers') as any)
      .select('*')
      .eq('id', cash_drawer_id)
      .single()

    if (drawerError || !drawer) {
      logger.error('Drawer fetch error', { error: drawerError?.message, cash_drawer_id })
      return NextResponse.json({ error: 'Cash drawer not found' }, { status: 404 })
    }

    if (drawer.status !== 'open') {
      return NextResponse.json(
        { error: `Drawer is already ${drawer.status}. Only open drawers can be closed.` },
        { status: 400 }
      )
    }

    const drawerOpenedAt = drawer.opened_at ?? drawer.created_at
    const openingAmount = Number(drawer.opening_amount) || 0

    // Calculate cash sales: sum of cash payments on this register since drawer opened
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: salesData, error: salesError } = await (sb.from('transaction_payments') as any)
      .select('amount, transactions!inner(register_id, type)')
      .eq('payment_method', 'cash')
      .eq('transactions.register_id', drawer.register_id)
      .gte('created_at', drawerOpenedAt)

    if (salesError) {
      logger.error('Cash sales query error', { error: salesError.message })
      return NextResponse.json({ error: 'Failed to calculate cash totals' }, { status: 500 })
    }

    let totalSales = 0
    let totalRefunds = 0
    let transactionCount = 0

    if (salesData) {
      for (const payment of salesData) {
        const txType = payment.transactions?.type
        const amount = Number(payment.amount) || 0
        if (txType === 'return' || txType === 'void') {
          totalRefunds += Math.abs(amount)
        } else {
          totalSales += amount
          transactionCount++
        }
      }
    }

    // Calculate safe drops
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dropsData, error: dropsError } = await (sb.from('cash_drawer_drops') as any)
      .select('amount, drop_type')
      .eq('cash_drawer_id', cash_drawer_id)

    if (dropsError) {
      logger.error('Cash drops query error', { error: dropsError.message })
      return NextResponse.json({ error: 'Failed to calculate drop totals' }, { status: 500 })
    }

    let totalDrops = 0
    if (dropsData) {
      for (const drop of dropsData) {
        if (drop.drop_type === 'safe_drop' || drop.drop_type === 'bank_deposit') {
          totalDrops += Math.abs(Number(drop.amount) || 0)
        }
      }
    }

    const expectedCash = openingAmount + totalSales - totalRefunds - totalDrops
    const variance = actual_cash - expectedCash
    const closedAt = new Date().toISOString()

    // Update the drawer to closed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (sb.from('cash_drawers') as any)
      .update({
        status: 'closed',
        closed_by: session.employeeId,
        closed_at: closedAt,
        closing_amount: actual_cash,
        expected_amount: expectedCash,
        variance,
        notes: notes || null,
      })
      .eq('id', cash_drawer_id)

    if (updateError) {
      logger.error('Drawer close update error', { error: updateError.message })
      return NextResponse.json({ error: 'Failed to close drawer' }, { status: 500 })
    }

    const drawerOpenTime = new Date(drawerOpenedAt).getTime()
    const drawerCloseTime = new Date(closedAt).getTime()
    const durationHours = Math.round(((drawerCloseTime - drawerOpenTime) / (1000 * 60 * 60)) * 100) / 100

    logger.info('Cash drawer closed', {
      cash_drawer_id,
      closed_by: session.employeeId,
      expected_cash: expectedCash,
      actual_cash,
      variance,
      location_id: session.locationId,
    })

    return NextResponse.json({
      success: true,
      summary: {
        opening_amount: openingAmount,
        total_sales: totalSales,
        total_refunds: totalRefunds,
        total_drops: totalDrops,
        expected_cash: expectedCash,
        actual_cash,
        variance,
        transaction_count: transactionCount,
        drawer_duration_hours: durationHours,
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Drawer close error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
