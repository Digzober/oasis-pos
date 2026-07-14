import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { updateLookup, deactivateLookup } from '@/lib/services/lookupService'
import { logger } from '@/lib/utils/logger'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    if (!await assertOrgOwnership('producers', id, session.organizationId)) return NextResponse.json({ error: 'Producer not found' }, { status: 404 })
    const body = await request.json()
    const producer = await updateLookup('producers', id, body)
    return NextResponse.json({ producer })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Producer update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    if (!await assertOrgOwnership('producers', id, session.organizationId)) return NextResponse.json({ error: 'Producer not found' }, { status: 404 })
    await deactivateLookup('producers', id)
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Producer deactivate error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
