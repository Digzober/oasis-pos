import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { updateLookup, deactivateLookup } from '@/lib/services/lookupService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('strains', id, session.organizationId)) return NextResponse.json({ error: 'Strain not found' }, { status: 404 }); const body = await request.json()
    return NextResponse.json({ strain: await updateLookup('strains', id, body) })
  } catch (err) { logger.error('Strain update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('strains', id, session.organizationId)) return NextResponse.json({ error: 'Strain not found' }, { status: 404 }); await deactivateLookup('strains', id)
    return NextResponse.json({ success: true })
  } catch (err) { logger.error('Strain delete error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
