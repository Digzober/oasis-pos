import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { assignPermissionGroups } from '@/lib/services/employeeManagementService'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(); const { id } = await params
    if (!await assertOrgOwnership('employees', id, session.organizationId)) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    const body = z.object({ group_ids: z.array(z.uuid()) }).parse(await req.json())
    if (!await assertOrgOwnership('permission_groups', body.group_ids, session.organizationId)) return NextResponse.json({ error: 'Permission group not found' }, { status: 404 })
    await assignPermissionGroups(id, body.group_ids)
    return NextResponse.json({ success: true })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
