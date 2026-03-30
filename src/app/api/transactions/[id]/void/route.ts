import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { voidTransaction } from '@/lib/services/voidReturnService'
import { logger } from '@/lib/utils/logger'

const VoidSchema = z.object({
  void_reason: z.string().min(1, 'Void reason is required'),
  cash_drawer_id: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params

    // Manager permission check
    if (!hasPermission(session, PERMISSIONS.ADMINISTRATOR) && !hasPermission(session, PERMISSIONS.POS_MANAGER)) {
      return NextResponse.json({ error: 'Manager permission required to void transactions' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = VoidSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const result = await voidTransaction(
      id,
      session.employeeId,
      parsed.data.void_reason,
      parsed.data.cash_drawer_id ?? '',
    )

    return NextResponse.json(result)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Void API error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
