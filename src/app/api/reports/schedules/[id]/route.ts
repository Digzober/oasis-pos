import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { updateSchedule, deactivateSchedule } from '@/lib/services/reportSchedulerService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('report_schedules', id, session.organizationId)) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 }); return NextResponse.json({ schedule: await updateSchedule(id, await req.json()) }) }
  catch (err) { logger.error('Schedule update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('report_schedules', id, session.organizationId)) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 }); await deactivateSchedule(id); return NextResponse.json({ success: true }) }
  catch (err) { logger.error('Schedule delete error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
