import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSaleTransaction } from '@/lib/services/transactionService'
import { logger } from '@/lib/utils/logger'

const CreateTransactionSchema = z.object({
  location_id: z.uuid(),
  register_id: z.uuid(),
  cash_drawer_id: z.uuid(),
  customer_id: z.uuid().nullable(),
  is_medical: z.boolean(),
  items: z.array(z.object({
    product_id: z.uuid(),
    inventory_item_id: z.uuid(),
    quantity: z.number().int().positive(),
  })).min(1, 'Cart cannot be empty'),
  amount_tendered: z.number().positive(),
  payment_method: z.string().default('cash'),
  manual_discount_ids: z.array(z.uuid()).default([]),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = CreateTransactionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 },
      )
    }

    const result = await createSaleTransaction({
      ...parsed.data,
      organization_id: session.organizationId,
      employee_id: session.employeeId,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Transaction creation error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
