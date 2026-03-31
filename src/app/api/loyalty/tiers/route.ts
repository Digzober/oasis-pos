import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listLoyaltyTiers, createLoyaltyTier } from '@/lib/services/loyaltyConfigService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try { const s = await requireSession(); return NextResponse.json({ tiers: await listLoyaltyTiers(s.organizationId) }) }
  catch (err) { logger.error('Tiers error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { const s = await requireSession(); return NextResponse.json({ tier: await createLoyaltyTier({ ...(await req.json()), organization_id: s.organizationId }) }, { status: 201 }) }
  catch (err) { logger.error('Tier create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
