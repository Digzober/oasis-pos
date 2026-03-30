import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { updateLookup, deactivateLookup } from '@/lib/services/lookupService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; const body = await request.json()
    return NextResponse.json({ vendor: await updateLookup('vendors', id, body) })
  } catch (err) { logger.error('Vendor update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; await deactivateLookup('vendors', id)
    return NextResponse.json({ success: true })
  } catch (err) { logger.error('Vendor delete error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
