import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { searchCustomers, createCustomer } from '@/lib/services/customerService'
import { logger } from '@/lib/utils/logger'

const CreateSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  date_of_birth: z.string().date(),
  phone: z.string().max(20).optional(),
  email: z.email().optional(),
  id_type: z.enum(['drivers_license', 'passport', 'state_id', 'military_id', 'tribal_id']).optional(),
  id_number: z.string().optional(),
  id_state: z.string().max(2).optional(),
  id_expiration: z.string().date().optional(),
  medical_card_number: z.string().optional(),
  medical_card_expiration: z.string().date().optional(),
  medical_provider: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const q = request.nextUrl.searchParams.get('q') ?? ''

    if (q.length < 2) {
      return NextResponse.json({ customers: [] })
    }

    const results = await searchCustomers(session.organizationId, q)
    return NextResponse.json({ customers: results })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Customer search error', { error: String(err) })
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
