import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listSegments, createSegment } from '@/lib/services/segmentService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try { const s = await requireSession(); return NextResponse.json({ segments: await listSegments(s.organizationId) }) }
  catch (err) { logger.error('Segments error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { const s = await requireSession(); const body = await req.json(); return NextResponse.json({ segment: await createSegment({ ...body, organization_id: s.organizationId }) }, { status: 201 }) }
  catch (err) { logger.error('Segment create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
