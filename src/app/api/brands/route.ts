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

    const result = await listLookupPaginated('brands', session.organizationId, {
      page,
      limit,
      includeInactive,
    })

    return NextResponse.json({
      brands: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Brands error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const brand = await createLookup('brands', { ...body, organization_id: session.organizationId })
    return NextResponse.json({ brand }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Brand create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
