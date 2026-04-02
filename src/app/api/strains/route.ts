import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listLookupPaginated, createLookup } from '@/lib/services/lookupService'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '100', 10)))
    const includeInactive = url.searchParams.get('includeInactive') === 'true'
    const strainType = url.searchParams.get('strain_type') ?? ''

    const extraFilters: Record<string, unknown> = {}
    if (strainType && strainType !== 'all') {
      extraFilters.strain_type = strainType
    }

    const result = await listLookupPaginated('strains', session.organizationId, {
      page,
      limit,
      includeInactive,
      extraFilters,
    })

    return NextResponse.json({
      strains: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Strains error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const strain = await createLookup('strains', { ...body, organization_id: session.organizationId })
    return NextResponse.json({ strain }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Strain create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
