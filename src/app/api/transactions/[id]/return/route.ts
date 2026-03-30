import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { processReturn } from '@/lib/services/voidReturnService'
import { logger } from '@/lib/utils/logger'

const ReturnSchema = z.object({
  return_reason: z.string().min(1, 'Return reason is required'),
  cash_drawer_id: z.string().optional(),
  lines: z.array(z.object({
    transaction_line_id: z.uuid(),
    quantity: z.number().int().positive(),
    restore_to_inventory: z.boolean().default(true),
  })).min(1, 'At least one return line is required'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params

    if (!hasPermission(session, PERMISSIONS.ADMINISTRATOR) && !hasPermission(session, PERMISSIONS.POS_MANAGER)) {
      return NextResponse.json({ error: 'Manager permission required to process returns' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = ReturnSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const result = await processReturn(
      id,
      session.employeeId,
      parsed.data.cash_drawer_id ?? '',
      parsed.data.return_reason,
      parsed.data.lines,
      session.locationId,
      '',
      session.organizationId,
    )

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Return API error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
