import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const body = await req.json()

    if (!body.register_id || !body.location_id || !body.opened_by) {
      return NextResponse.json({ error: 'register_id, location_id, and opened_by are required' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    const openingAmount = body.opening_amount ?? 200

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (sb.from('cash_drawers') as any)
      .insert({
        register_id: body.register_id,
        location_id: body.location_id,
        opened_by: body.opened_by,
        opening_amount: openingAmount,
        status: 'open',
      })
      .select()
      .single()

    if (error) {
      logger.error('Cash drawer open error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ drawer: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Cash drawer create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
