import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { sendCampaign } from '@/lib/services/campaignService'
import { logger } from '@/lib/utils/logger'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const s = await requireSession(); const { id } = await params; return NextResponse.json(await sendCampaign(id, s.organizationId)) }
  catch (err) { logger.error('Campaign send error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
