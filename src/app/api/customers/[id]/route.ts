import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { getCustomerProfile, updateCustomer } from '@/lib/services/customerService'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  middle_name: z.string().max(100).nullable().optional(),
  prefix: z.string().max(20).nullable().optional(),
  suffix: z.string().max(20).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.email().nullable().optional(),
  date_of_birth: z.string().date().optional(),
  address_line1: z.string().max(200).nullable().optional(),
  address_line2: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(2).nullable().optional(),
  zip: z.string().max(10).nullable().optional(),
  id_type: z.enum(['drivers_license', 'passport', 'state_id', 'military_id']).nullable().optional(),
  id_number: z.string().nullable().optional(),
  id_state: z.string().max(2).nullable().optional(),
  id_expiration: z.string().date().nullable().optional(),
  medical_card_number: z.string().nullable().optional(),
  medical_card_expiration: z.string().date().nullable().optional(),
  medical_provider: z.string().nullable().optional(),
  is_medical: z.boolean().optional(),
  status: z.enum(['active', 'banned', 'inactive']).optional(),
  ban_reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  external_code: z.string().nullable().optional(),
  opted_into_marketing: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params
    const profile = await getCustomerProfile(id)
    return NextResponse.json({ customer: profile })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Customer profile error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await request.json()
    const parsed = UpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const customer = await updateCustomer(id, parsed.data)

    // Write audit log entry
    const sb = await createSupabaseServerClient()
    const { error: auditErr } = await sb
      .from('audit_log')
      .insert({
        organization_id: session.organizationId,
        employee_id: session.employeeId,
        location_id: session.locationId,
        entity_type: 'customer',
        entity_id: id,
        event_type: 'update',
        metadata: { fields: Object.keys(parsed.data) },
      })

    if (auditErr) {
      logger.warn('Failed to write customer update audit log', { id, error: auditErr.message })
    }

    return NextResponse.json({ customer })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Customer update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
