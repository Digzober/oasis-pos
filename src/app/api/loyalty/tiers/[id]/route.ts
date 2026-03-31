import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { updateLoyaltyTier, deleteLoyaltyTier } from '@/lib/services/loyaltyConfigService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ tier: await updateLoyaltyTier(id, await req.json()) }) }
  catch (err) { logger.error('Tier update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; await deleteLoyaltyTier(id); return NextResponse.json({ success: true }) }
  catch (err) { logger.error('Tier delete error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
