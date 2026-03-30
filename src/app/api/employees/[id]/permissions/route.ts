import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { assignPermissionGroups } from '@/lib/services/employeeManagementService'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(); const { id } = await params
    const body = z.object({ group_ids: z.array(z.uuid()) }).parse(await req.json())
    await assignPermissionGroups(id, body.group_ids)
    return NextResponse.json({ success: true })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
