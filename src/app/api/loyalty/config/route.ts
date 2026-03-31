import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getLoyaltyConfig, updateLoyaltyConfig } from '@/lib/services/loyaltyConfigService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try { const s = await requireSession(); return NextResponse.json({ config: await getLoyaltyConfig(s.organizationId) }) }
  catch (err) { logger.error('Loyalty config error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function PUT(req: NextRequest) {
  try { const s = await requireSession(); return NextResponse.json({ config: await updateLoyaltyConfig(s.organizationId, await req.json()) }) }
  catch (err) { logger.error('Loyalty config update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
