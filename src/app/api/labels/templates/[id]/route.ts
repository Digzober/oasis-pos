import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getTemplate, updateTemplate } from '@/lib/services/labelService'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ template: await getTemplate(id) }) }
  catch (err) { logger.error('Template get error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ template: await updateTemplate(id, await req.json()) }) }
  catch (err) { logger.error('Template update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
