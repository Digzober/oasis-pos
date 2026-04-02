import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { updateTemplate } from '@/lib/services/templateService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ template: await updateTemplate(id, await req.json()) }) }
  catch (err) { logger.error('Template update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const template = await updateTemplate(id, { is_active: false, deactivated_at: new Date().toISOString() })
    return NextResponse.json({ template })
  } catch (err) {
    logger.error('Template deactivate error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
