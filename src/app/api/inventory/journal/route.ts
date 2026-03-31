import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getInventoryJournal } from '@/lib/services/inventoryJournalService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try {
    const s = await requireSession(); const p = req.nextUrl.searchParams
    return NextResponse.json(await getInventoryJournal({
      location_id: p.get('location_id') ?? s.locationId,
      event_type: p.get('event_type') || undefined,
      date_from: p.get('date_from') || undefined,
      date_to: p.get('date_to') || undefined,
      page: Number(p.get('page') || 1),
    }))
  } catch (err) { logger.error('Journal error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
