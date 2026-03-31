import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getCampaign, updateCampaign } from '@/lib/services/campaignService'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ campaign: await getCampaign(id) }) }
  catch (err) { logger.error('Campaign get error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ campaign: await updateCampaign(id, await req.json()) }) }
  catch (err) { logger.error('Campaign update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
