import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getReport } from '@/lib/services/reconciliationService'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; const report = await getReport(id); return report ? NextResponse.json({ report }) : NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  catch (err) { logger.error('Report get error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
