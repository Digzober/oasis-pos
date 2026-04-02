import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateQueueItemSchema = z.object({
  id: z.string().uuid(),
  status: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const url = new URL(request.url)

    const status = url.searchParams.get('status')
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') ?? '25', 10)))
    const offset = (page - 1) * perPage

    let query = (sb.from('biotrack_destruction_queue') as any)
      .select('*', { count: 'exact' })
      .eq('location_id', session.locationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: items, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      items: items ?? [],
      pagination: {
        page,
        per_page: perPage,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / perPage),
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Destruction queue list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = UpdateQueueItemSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { data: item, error } = await (sb.from('biotrack_destruction_queue') as any)
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq('id', parsed.data.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ item })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Destruction queue update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
