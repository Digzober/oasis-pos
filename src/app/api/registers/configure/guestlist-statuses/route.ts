import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CreateStatusSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).default('#6B7280'),
  sort_order: z.number().int().optional(),
  is_default: z.boolean().optional(),
})

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data: statuses, error } = await sb
      .from('guestlist_statuses')
      .select('*')
      .eq('location_id', session.locationId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ statuses: statuses ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Guestlist statuses list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = CreateStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { data, error } = await sb
      .from('guestlist_statuses')
      .insert({
        location_id: session.locationId,
        name: parsed.data.name,
        color: parsed.data.color,
        sort_order: parsed.data.sort_order ?? 0,
        is_default: parsed.data.is_default ?? false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ status: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Guestlist status create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
