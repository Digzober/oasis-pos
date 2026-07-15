import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { getLoyaltyConfig, updateLoyaltyConfig } from '@/lib/services/loyaltyConfigService'
import { logger } from '@/lib/utils/logger'

const LoyaltyConfigUpdateSchema = z.object({
  accrual_rate: z.number().min(0).max(1_000_000),
}).strict()

export async function GET() {
  try { const s = await requireSession(); return NextResponse.json({ config: await getLoyaltyConfig(s.organizationId) }) }
  catch (err) { logger.error('Loyalty config error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function PUT(req: NextRequest) {
  try {
    const s = await requireSession()
    const parsed = LoyaltyConfigUpdateSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    return NextResponse.json({ config: await updateLoyaltyConfig(s.organizationId, parsed.data) })
  }
  catch (err) { logger.error('Loyalty config update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
