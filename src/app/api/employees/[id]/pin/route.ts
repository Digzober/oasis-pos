import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { getEmployeePermissions, hasAnyPermission } from '@/lib/services/permissionService'
import { resetPin } from '@/lib/services/employeeManagementService'
import { logger } from '@/lib/utils/logger'

const PinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()

    // Load permissions from DB (JWT stores permissions: [])
    const perms = await getEmployeePermissions(session.employeeId)
    if (!hasAnyPermission(perms, [PERMISSIONS.EDIT_USERS, PERMISSIONS.ADMINISTRATOR])) {
      return NextResponse.json({ error: 'Missing permission: MAINT_USERS_EDIT or GENERAL_ADMIN_ADMINISTRATOR' }, { status: 403 })
    }

    const { id } = await params
    const parsed = PinSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    await resetPin(id, parsed.data.pin, session.employeeId)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('PIN reset error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
