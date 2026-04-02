import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { runAllRules } from '@/lib/services/smartTagService'
import { logger } from '@/lib/utils/logger'

export async function POST() {
  try {
    const session = await requireSession()
    const { results } = await runAllRules(session.organizationId)

    const totalTagged = results.reduce((sum, r) => sum + r.tagged, 0)
    const totalUntagged = results.reduce((sum, r) => sum + r.untagged, 0)
    const errors = results.filter((r) => r.error)

    return NextResponse.json({
      success: errors.length === 0,
      rulesProcessed: results.length,
      totalTagged,
      totalUntagged,
      errors: errors.length > 0 ? errors : undefined,
      results,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Smart tag run-all error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
