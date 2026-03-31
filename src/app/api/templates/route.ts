import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listTemplates, createTemplate } from '@/lib/services/templateService'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest) {
  try { const s = await requireSession(); return NextResponse.json({ templates: await listTemplates(s.organizationId, req.nextUrl.searchParams.get('type') || undefined) }) }
  catch (err) { logger.error('Templates error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try { const s = await requireSession(); return NextResponse.json({ template: await createTemplate({ ...(await req.json()), organization_id: s.organizationId }) }, { status: 201 }) }
  catch (err) { logger.error('Template create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
