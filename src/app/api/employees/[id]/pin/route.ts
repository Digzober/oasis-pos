import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { resetPin } from '@/lib/services/employeeManagementService'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    if (!hasPermission(session, PERMISSIONS.ADMINISTRATOR)) return NextResponse.json({ error: 'Admin permission required' }, { status: 403 })
    const { id } = await params
    const { pin } = z.object({ pin: z.string().regex(/^\d{4}$/) }).parse(await req.json())
    await resetPin(id, pin, session.employeeId)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) { const a = err as { code: string; message: string; statusCode?: number }; return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 }) }
    logger.error('PIN reset error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
