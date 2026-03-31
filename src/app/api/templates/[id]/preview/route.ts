import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { previewTemplate } from '@/lib/services/templateService'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; const { customer_id } = await req.json(); return NextResponse.json(await previewTemplate(id, customer_id)) }
  catch (err) { logger.error('Template preview error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
