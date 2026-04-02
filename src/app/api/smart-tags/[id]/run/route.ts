import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { applyRule } from '@/lib/services/smartTagService'
import { logger } from '@/lib/utils/logger'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params

    const result = await applyRule(session.organizationId, id)

    return NextResponse.json({
      success: true,
      tagged: result.tagged,
      untagged: result.untagged,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Smart tag rule run error', { error: String(err) })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
