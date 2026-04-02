import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
  status: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const sp = req.nextUrl.searchParams
    const parsed = QuerySchema.safeParse({
      page: sp.get('page') ?? undefined,
      per_page: sp.get('per_page') ?? undefined,
      status: sp.get('status') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query params', details: parsed.error.issues }, { status: 400 })
    }

    const { page, per_page, status } = parsed.data
    const from = (page - 1) * per_page
    const to = from + per_page - 1

    let query = (sb.from('workflow_executions') as any)
      .select('*, customers ( first_name, last_name )', { count: 'exact' })
      .eq('workflow_id', id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      executions: data ?? [],
      pagination: {
        page,
        per_page,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / per_page),
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Workflow executions GET error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
