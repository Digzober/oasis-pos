import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listSchedules, createSchedule } from '@/lib/services/reportSchedulerService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try { const s = await requireSession(); return NextResponse.json({ schedules: await listSchedules(s.organizationId) }) }
  catch (err) { logger.error('Schedules error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { const s = await requireSession(); return NextResponse.json({ schedule: await createSchedule({ ...(await req.json()), organization_id: s.organizationId }) }, { status: 201 }) }
  catch (err) { logger.error('Schedule create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
