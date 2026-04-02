import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { exportManifestList } from '@/lib/services/manifestService'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

const VALID_TABS = ['wholesale', 'retail'] as const
const VALID_STATUSES = ['draft', 'open', 'in_transit', 'delivered', 'sold', 'cancelled'] as const

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()

    const params = request.nextUrl.searchParams
    const tab = params.get('tab') ?? 'wholesale'
    const status = params.get('status') ?? undefined
    const search = params.get('search') ?? undefined

    if (!VALID_TABS.includes(tab as typeof VALID_TABS[number])) {
      return NextResponse.json({ error: 'Invalid tab parameter' }, { status: 400 })
    }

    if (status && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return NextResponse.json({ error: 'Invalid status parameter' }, { status: 400 })
    }

    const csv = await exportManifestList(session.organizationId, {
      tab: tab as 'wholesale' | 'retail',
      status: status as typeof VALID_STATUSES[number] | undefined,
      search,
    })

    const timestamp = new Date().toISOString().slice(0, 10)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="manifests-${tab}-${timestamp}.csv"`,
      },
    })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      )
    }
    logger.error('Export manifest list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
