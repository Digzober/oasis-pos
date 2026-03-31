import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listCampaigns, createCampaign } from '@/lib/services/campaignService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { const s = await requireSession(); const p = req.nextUrl.searchParams; return NextResponse.json(await listCampaigns(s.organizationId, { status: p.get('status') || undefined })) }
  catch (err) { logger.error('Campaigns error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { const s = await requireSession(); return NextResponse.json({ campaign: await createCampaign({ ...(await req.json()), organization_id: s.organizationId }) }, { status: 201 }) }
  catch (err) { logger.error('Campaign create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
