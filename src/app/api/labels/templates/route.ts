import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listTemplates, createTemplate } from '@/lib/services/labelService'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try { const session = await requireSession(); return NextResponse.json({ templates: await listTemplates(session.organizationId) }) }
  catch (err) { logger.error('Templates error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()
    const template = await createTemplate({ ...body, organization_id: session.organizationId })
    return NextResponse.json({ template }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) { const a = err as { code: string; message: string; statusCode?: number }; return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 }) }
    logger.error('Template create error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
