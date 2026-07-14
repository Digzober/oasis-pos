import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { getEmployeeProfile, updateEmployee, deactivateEmployee } from '@/lib/services/employeeManagementService'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('employees', id, session.organizationId)) return NextResponse.json({ error: 'Employee not found' }, { status: 404 }); return NextResponse.json({ employee: await getEmployeeProfile(id) }) }
  catch (err) {
    if (err && typeof err === 'object' && 'code' in err) { const a = err as { code: string; message: string; statusCode?: number }; return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 }) }
    logger.error('Employee get error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('employees', id, session.organizationId)) return NextResponse.json({ error: 'Employee not found' }, { status: 404 }); const body = await req.json(); return NextResponse.json({ employee: await updateEmployee(id, body) }) }
  catch (err) { logger.error('Employee update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(); const { id } = await params
    if (!await assertOrgOwnership('employees', id, session.organizationId)) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    const body = await req.json().catch(() => ({ reason: 'Deactivated' }))
    await deactivateEmployee(id, body.reason ?? 'Deactivated', session.employeeId)
    return NextResponse.json({ success: true })
  } catch (err) { logger.error('Employee deactivate error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
