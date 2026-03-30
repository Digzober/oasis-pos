import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getLocationSettings, updateLocationSettings } from '@/lib/services/settingsService'
import { logger } from '@/lib/utils/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; return NextResponse.json({ settings: await getLocationSettings(id) }) }
  catch (err) { logger.error('Settings get error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireSession(); const { id } = await params; const body = await req.json(); await updateLocationSettings(id, body); return NextResponse.json({ success: true }) }
  catch (err) { logger.error('Settings update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
