import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { updateZone } from '@/lib/services/deliveryService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const { id } = await params; if (!await assertOrgOwnership('delivery_zones', id, session.organizationId)) return NextResponse.json({ error: 'Zone not found' }, { status: 404 }); return NextResponse.json({ zone: await updateZone(id, await req.json()) }) }
  catch (err) { logger.error('Zone update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
