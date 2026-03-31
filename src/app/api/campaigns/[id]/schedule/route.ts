import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { scheduleCampaign } from '@/lib/services/campaignService'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; const { scheduled_at } = await req.json(); await scheduleCampaign(id, scheduled_at); return NextResponse.json({ success: true }) }
  catch (err) { logger.error('Campaign schedule error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
