import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getSettingsSnapshot, patchLocationSettings } from '@/lib/settings/service'
import { logger } from '@/lib/utils/logger'

function errorResponse(err: unknown, operation: string) {
  if (err && typeof err === 'object' && 'code' in err) {
    const appErr = err as { code: string; message: string; statusCode?: number }
    const message = appErr.code === 'UNAUTHORIZED' ? 'Authentication required' : appErr.message
    return NextResponse.json({ error: message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
  }
  logger.error(`Register settings ${operation} error`, { error: String(err) })
  return NextResponse.json({ error: 'Server error' }, { status: 500 })
}

export async function GET() {
  try {
    const session = await requireSession()
    const snapshot = await getSettingsSnapshot(session.locationId)
    return NextResponse.json({ settings: snapshot.location })
  } catch (err) {
    return errorResponse(err, 'get')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const settings = await patchLocationSettings(session.locationId, await request.json())
    return NextResponse.json({ settings })
  } catch (err) {
    return errorResponse(err, 'update')
  }
}
