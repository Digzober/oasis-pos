import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import {
  getGuestlistWorkflowMappings,
  GuestlistWorkflowPatchSchema,
  patchGuestlistWorkflowMappings,
} from '@/lib/guestlist/workflowMappings'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await requireSession()
    const mappings = await getGuestlistWorkflowMappings(session.locationId)
    return NextResponse.json({ mappings })
  } catch (error) {
    return errorResponse(error, 'get')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const parsed = GuestlistWorkflowPatchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 },
      )
    }
    const mappings = await patchGuestlistWorkflowMappings(session.locationId, parsed.data)
    return NextResponse.json({ mappings })
  } catch (error) {
    return errorResponse(error, 'update')
  }
}

function errorResponse(error: unknown, operation: string) {
  if (error && typeof error === 'object' && 'code' in error) {
    const appError = error as { code: string; message: string; statusCode?: number }
    const message = appError.code === 'UNAUTHORIZED'
      ? 'Authentication required'
      : appError.message
    return NextResponse.json(
      { error: message, code: appError.code },
      { status: appError.statusCode ?? 500 },
    )
  }
  logger.error(`Guestlist workflow mappings ${operation} error`, { error: String(error) })
  return NextResponse.json({ error: 'Server error' }, { status: 500 })
}
