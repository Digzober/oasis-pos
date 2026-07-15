import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getSettingsSnapshot, patchLocationSettings } from '@/lib/settings/service'
import { CustomerFieldVisibilitySchema } from '@/lib/settings/schema'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await requireSession()
    const snapshot = await getSettingsSnapshot(session.locationId)
    return NextResponse.json({ fields: snapshot.location.customer_field_visibility ?? {} })
  } catch (err) {
    return handleError(err, 'get')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const parsed = CustomerFieldVisibilitySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }
    await patchLocationSettings(session.locationId, { customer_field_visibility: parsed.data })
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleError(err, 'update')
  }
}

function handleError(err: unknown, operation: string) {
  if (err && typeof err === 'object' && 'code' in err) {
    const appErr = err as { code: string; message: string; statusCode?: number }
    const message = appErr.code === 'UNAUTHORIZED' ? 'Authentication required' : appErr.message
    return NextResponse.json({ error: message }, { status: appErr.statusCode ?? 500 })
  }
  logger.error(`Customer fields ${operation} error`, { error: String(err) })
  return NextResponse.json({ error: 'Server error' }, { status: 500 })
}
