import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { previewTemplate } from '@/lib/services/templateService'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('campaign_templates', id, session.organizationId)) return NextResponse.json({ error: 'Template not found' }, { status: 404 }); const { customer_id } = await req.json(); if (!await assertOrgOwnership('customers', customer_id, session.organizationId)) return NextResponse.json({ error: 'Customer not found' }, { status: 404 }); return NextResponse.json(await previewTemplate(id, customer_id)) }
  catch (err) { logger.error('Template preview error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
