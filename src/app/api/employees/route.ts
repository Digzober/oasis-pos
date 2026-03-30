import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { listEmployees, createEmployee } from '@/lib/services/employeeManagementService'
import { logger } from '@/lib/utils/logger'

const CreateSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.email().optional(),
  phone: z.string().optional(),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
  role: z.enum(['budtender', 'shift_lead', 'manager', 'admin', 'owner']),
  location_ids: z.array(z.uuid()).min(1),
  primary_location_id: z.uuid(),
  permission_group_ids: z.array(z.uuid()),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const p = request.nextUrl.searchParams
    const result = await listEmployees(session.organizationId, {
      search: p.get('search') || undefined, role: p.get('role') || undefined,
      status: p.get('status') || 'active', page: Number(p.get('page') || 1),
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Employee list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    const employee = await createEmployee({ ...parsed.data, organization_id: session.organizationId })
    return NextResponse.json({ employee }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      return NextResponse.json({ error: a.message, code: a.code }, { status: a.statusCode ?? 500 })
    }
    logger.error('Employee create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
