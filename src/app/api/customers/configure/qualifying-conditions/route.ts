import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const p = request.nextUrl.searchParams
    const q = p.get('q') || ''
    const page = Math.max(1, Number(p.get('page') || 1))
    const perPage = Math.max(1, Math.min(100, Number(p.get('per_page') || 50)))
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const sb = await createSupabaseServerClient()
    let query = sb
      .from('qualifying_conditions')
      .select('*', { count: 'exact' })
      .eq('organization_id', session.organizationId)
      .eq('is_active', true)

    if (q) {
      query = query.ilike('name', `%${q}%`)
    }

    const { data, count, error } = await query.order('name', { ascending: true }).range(from, to)
    if (error) throw error

    const total = count ?? 0
    return NextResponse.json({
      conditions: data,
      pagination: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Qualifying conditions list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })

    const sb = await createSupabaseServerClient()
    const { data, error } = await sb
      .from('qualifying_conditions')
      .insert({ ...parsed.data, organization_id: session.organizationId })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ condition: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Qualifying condition create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
