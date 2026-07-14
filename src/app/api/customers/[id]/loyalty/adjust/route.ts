import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const AdjustSchema = z.object({
  points: z.number().int(),
  reason: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id: customerId } = await params
    const body = await request.json()
    const parsed = AdjustSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { points, reason, notes } = parsed.data
    const sb = await createSupabaseServerClient()

    const { data, error } = await (sb as any).rpc('adjust_loyalty_points', {
      p_customer: customerId,
      p_org: session.organizationId,
      p_delta: points,
      p_reason: reason,
      p_lifetime_delta: Math.max(points, 0),
      p_created_by: session.employeeId,
    })
    if (error) {
      const negative = error.message?.includes('negative')
      return NextResponse.json(
        { error: negative ? 'Adjustment would result in negative balance' : 'Failed to adjust loyalty balance' },
        { status: negative ? 400 : 500 },
      )
    }
    const newCurrentPoints = Number(data?.new_balance ?? 0)

    // Audit log
    const { error: auditError } = await sb
      .from('audit_log')
      .insert({
        organization_id: session.organizationId,
        entity_type: 'loyalty_balance',
        entity_id: customerId,
        event_type: 'adjust',
        metadata: {
          customer_id: customerId,
          points_change: points,
          balance_after: newCurrentPoints,
          reason,
          notes: notes ?? null,
        },
        employee_id: session.employeeId,
      })

    if (auditError) {
      logger.error('Loyalty adjust audit log failed', { error: auditError.message })
    }

    return NextResponse.json({ success: true, new_balance: newCurrentPoints })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Loyalty adjust error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
