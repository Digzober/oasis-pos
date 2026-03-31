import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { previewSegment } from '@/lib/services/segmentService'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest) {
  try { const s = await requireSession(); const { rules } = await req.json(); return NextResponse.json(await previewSegment(rules, s.organizationId)) }
  catch (err) { logger.error('Segment preview error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
