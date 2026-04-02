import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CreateBadgeSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).default('#10b981'),
  icon: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  assignment_method: z.enum(['manual', 'automatic']),
  segment_id: z.uuid().optional(),
  show_in_register: z.boolean().optional(),
}).refine(
  (data) => data.assignment_method !== 'automatic' || data.segment_id,
  { message: 'segment_id is required when assignment_method is automatic', path: ['segment_id'] },
)

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const includeInactive = request.nextUrl.searchParams.get('include_inactive') === 'true'

    let query = sb
      .from('badges')
      .select('*, segments:segment_id ( id, name )')
      .eq('organization_id', session.organizationId)
      .order('name')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: badges, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const badgeList = badges ?? []
    const badgeIds = badgeList.map((b) => b.id)

    let memberCounts: Record<string, number> = {}
    if (badgeIds.length > 0) {
      const { data: cbRows, error: cbError } = await sb
        .from('customer_badges')
        .select('badge_id')
        .in('badge_id', badgeIds)

      if (cbError) {
        logger.error('Failed to fetch badge member counts', { error: cbError.message })
      } else {
        memberCounts = (cbRows ?? []).reduce<Record<string, number>>((acc, row) => {
          acc[row.badge_id] = (acc[row.badge_id] ?? 0) + 1
          return acc
        }, {})
      }
    }

    const badgesWithCounts = badgeList.map((badge) => ({
      ...badge,
      member_count: memberCounts[badge.id] ?? 0,
    }))

    return NextResponse.json({ badges: badgesWithCounts })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Badges list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = CreateBadgeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { data, error } = await sb
      .from('badges')
      .insert({
        name: parsed.data.name,
        color: parsed.data.color,
        icon: parsed.data.icon ?? null,
        description: parsed.data.description ?? null,
        assignment_method: parsed.data.assignment_method,
        segment_id: parsed.data.segment_id ?? null,
        show_in_register: parsed.data.show_in_register ?? false,
        organization_id: session.organizationId,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ badge: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Badge create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
