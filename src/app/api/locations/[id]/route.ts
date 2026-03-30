import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getLocation, updateLocation } from '@/lib/services/settingsService'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ location: await getLocation(id) }) }
  catch (err) { logger.error('Location get error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; const body = await req.json(); return NextResponse.json({ location: await updateLocation(id, body) }) }
  catch (err) { logger.error('Location update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
