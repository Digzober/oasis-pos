import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { adjustInventory } from '@/lib/services/inventoryAdjustmentService'
import { logger } from '@/lib/utils/logger'

const AdjustSchema = z.object({
  adjustment_type: z.enum(['count_correction', 'damage', 'theft', 'waste', 'testing', 'other']),
  new_quantity: z.number().min(0),
  reason: z.string().min(1),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    if (!hasPermission(session, PERMISSIONS.ADJUST_INVENTORY) && !hasPermission(session, PERMISSIONS.ADMINISTRATOR)) {
      return NextResponse.json({ error: 'Manager permission required' }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const parsed = AdjustSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })

    const result = await adjustInventory({ inventory_item_id: id, ...parsed.data, employee_id: session.employeeId })
    return NextResponse.json(result)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Adjust error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
