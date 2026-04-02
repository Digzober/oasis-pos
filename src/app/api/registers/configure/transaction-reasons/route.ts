import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CreateReasonSchema = z.object({
  reason_type: z.enum(['return', 'cancellation', 'void', 'adjustment']),
  name: z.string().min(1).max(200),
  sort_order: z.number().int().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const reasonType = request.nextUrl.searchParams.get('reason_type')
    const includeInactive = request.nextUrl.searchParams.get('include_inactive') === 'true'

    let query = sb
      .from('transaction_reasons')
      .select('*')
      .eq('location_id', session.locationId)
      .order('sort_order', { ascending: true })

    if (reasonType) {
      query = query.eq('reason_type', reasonType)
    }

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: reasons, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ reasons: reasons ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Transaction reasons list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = CreateReasonSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { data, error } = await sb
      .from('transaction_reasons')
      .insert({
        location_id: session.locationId,
        reason_type: parsed.data.reason_type,
        name: parsed.data.name,
        sort_order: parsed.data.sort_order ?? 0,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ reason: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Transaction reason create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
