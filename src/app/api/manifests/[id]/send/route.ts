import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { sendManifest } from '@/lib/services/manifestService'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await requireSession()
    const { id } = await context.params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Manifest ID is required' }, { status: 400 })
    }

    const manifest = await sendManifest(id, session.employeeId)

    return NextResponse.json({ manifest })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      )
    }
    logger.error('Send manifest error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
