import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createCustomer } from '@/lib/services/customerService'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const ALLOWED_SORT_FIELDS = [
  'created_at',
  'updated_at',
  'first_name',
  'last_name',
  'lifetime_spend',
  'visit_count',
  'last_visit_at',
  'status',
  'customer_type',
  'medical_card_expiration',
  'id_expiration',
] as const

type SortField = (typeof ALLOWED_SORT_FIELDS)[number]

const ListQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
  sort_by: z.enum(ALLOWED_SORT_FIELDS).default('created_at'),
  sort_dir: z.enum(['asc', 'desc']).default('desc'),
  type: z.enum(['medical', 'recreational']).optional(),
  status: z.enum(['active', 'banned', 'inactive']).optional(),
  group_id: z.string().uuid().optional(),
  include_archived: z.coerce.boolean().default(false),
})

const CreateSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  date_of_birth: z.string().date(),
  phone: z.string().max(20).optional(),
  email: z.email().optional(),
  id_type: z.enum(['drivers_license', 'passport', 'state_id', 'military_id']).optional(),
  id_number: z.string().optional(),
  id_state: z.string().max(2).optional(),
  id_expiration: z.string().date().optional(),
  medical_card_number: z.string().optional(),
  medical_card_expiration: z.string().date().optional(),
  medical_provider: z.string().optional(),
  middle_name: z.string().max(100).optional(),
  prefix: z.string().max(20).optional(),
  suffix: z.string().max(20).optional(),
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  zip: z.string().max(10).optional(),
  notes: z.string().optional(),
  external_code: z.string().optional(),
  opted_into_marketing: z.boolean().optional(),
  customer_type: z.enum(['recreational', 'medical', 'medical_out_of_state', 'medical_tax_exempt', 'non_cannabis', 'distributor', 'processor', 'retailer']).optional(),
  gender: z.string().max(50).optional(),
  pronoun: z.string().max(50).optional(),
  mobile_phone: z.string().max(20).optional(),
  drivers_license: z.string().optional(),
  drivers_license_expiration: z.string().date().optional(),
  id_start_date: z.string().date().optional(),
  opted_into_sms: z.boolean().optional(),
  opted_into_loyalty: z.boolean().optional(),
  caregiver_info: z.record(z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsed = ListQuerySchema.safeParse(params)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.issues }, { status: 400 })
    }

    const { q, page, per_page, sort_by, sort_dir, type, status, group_id, include_archived } = parsed.data
    const sb = await createSupabaseServerClient()

    // Pre-fetch customer IDs for group filter
    let groupCustomerIds: string[] | null = null
    if (group_id) {
      const { data: members, error: groupErr } = await sb
        .from('customer_group_members')
        .select('customer_id')
        .eq('customer_group_id', group_id)

      if (groupErr) {
        logger.error('Failed to fetch group members', { error: groupErr.message, group_id })
        return NextResponse.json({ error: 'Failed to filter by group' }, { status: 500 })
      }

      groupCustomerIds = (members ?? []).map((m) => m.customer_id)
      if (groupCustomerIds.length === 0) {
        return NextResponse.json({
          customers: [],
          pagination: { page, per_page, total: 0, total_pages: 0 },
        })
      }
    }

    let query = sb
      .from('customers')
      .select('*, loyalty_balances ( current_points, tier_id, loyalty_tiers ( id, name ) )', { count: 'exact' })
      .eq('organization_id', session.organizationId)

    // Active filter (use is_active column from migration)
    if (!include_archived) {
      query = query.neq('status', 'inactive')
    }

    // Status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Customer type filter
    if (type) {
      query = query.eq('customer_type', type)
    }

    // Group filter
    if (groupCustomerIds) {
      query = query.in('id', groupCustomerIds)
    }

    // Search
    if (q && q.trim().length >= 2) {
      const trimmed = q.trim()
      const digitsOnly = trimmed.replace(/\D/g, '')

      if (digitsOnly.length >= 10) {
        query = query.ilike('phone', `%${digitsOnly}%`)
      } else if (trimmed.includes('@')) {
        query = query.ilike('email', `%${trimmed}%`)
      } else {
        query = query.or(`first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%,medical_card_number.ilike.%${trimmed}%`)
      }
    }

    // Sorting & pagination
    const ascending = sort_dir === 'asc'
    query = query.order(sort_by as SortField, { ascending })

    const from = (page - 1) * per_page
    const to = from + per_page - 1
    query = query.range(from, to)

    const { data: customers, count, error } = await query

    if (error) {
      logger.error('Customer list query failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }

    const total = count ?? 0
    const total_pages = Math.ceil(total / per_page)

    return NextResponse.json({
      customers: customers ?? [],
      pagination: { page, per_page, total, total_pages },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Customer list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = CreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const customer = await createCustomer({
      ...parsed.data,
      organization_id: session.organizationId,
    })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Customer create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
