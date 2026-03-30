import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { clockIn, clockOut, getTimeClockHistory } from '@/lib/services/timeClockService'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    await requireSession()
    const p = request.nextUrl.searchParams
    const result = await getTimeClockHistory({
      location_id: p.get('location_id') || undefined,
      employee_id: p.get('employee_id') || undefined,
      date_from: p.get('date_from') || undefined,
      date_to: p.get('date_to') || undefined,
      page: Number(p.get('page') || 1),
    })
    return NextResponse.json(result)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Time clock list error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()

    if (body.action === 'clock_in') {
      const entry = await clockIn(body.employee_id ?? session.employeeId, session.locationId)
      return NextResponse.json({ entry }, { status: 201 })
    }
    if (body.action === 'clock_out') {
      const entry = await clockOut(body.entry_id, body.notes ?? null)
      return NextResponse.json({ entry })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Time clock error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
