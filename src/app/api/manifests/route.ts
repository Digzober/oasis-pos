import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { listManifests, createManifest } from '@/lib/services/manifestService'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

const VALID_TABS = ['wholesale', 'retail'] as const
const VALID_STATUSES = ['draft', 'open', 'in_transit', 'delivered', 'sold', 'cancelled'] as const
const VALID_SORT_DIRS = ['asc', 'desc'] as const
const VALID_SORT_COLUMNS = [
  'created_date', 'completed_date', 'title', 'customer_name',
  'status', 'total', 'subtotal', 'manifest_number', 'type',
] as const

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()

    const params = request.nextUrl.searchParams
    const tab = params.get('tab') ?? 'wholesale'
    const status = params.get('status') ?? undefined
    const search = params.get('search') ?? undefined
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1)
    const perPage = Math.min(500, Math.max(1, parseInt(params.get('per_page') ?? '100', 10) || 100))
    const sortBy = params.get('sort_by') ?? 'created_date'
    const sortDir = params.get('sort_dir') ?? 'desc'

    if (!VALID_TABS.includes(tab as typeof VALID_TABS[number])) {
      return NextResponse.json({ error: 'Invalid tab parameter' }, { status: 400 })
    }

    if (status && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return NextResponse.json({ error: 'Invalid status parameter' }, { status: 400 })
    }

    if (!VALID_SORT_COLUMNS.includes(sortBy as typeof VALID_SORT_COLUMNS[number])) {
      return NextResponse.json({ error: 'Invalid sort_by parameter' }, { status: 400 })
    }

    if (!VALID_SORT_DIRS.includes(sortDir as typeof VALID_SORT_DIRS[number])) {
      return NextResponse.json({ error: 'Invalid sort_dir parameter' }, { status: 400 })
    }

    const result = await listManifests(session.organizationId, {
      tab: tab as 'wholesale' | 'retail',
      status: status as typeof VALID_STATUSES[number] | undefined,
      search,
      page,
      per_page: perPage,
      sort_by: sortBy,
      sort_dir: sortDir as 'asc' | 'desc',
    })

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      )
    }
    logger.error('Manifest list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()

    const body = await request.json()

    const { title, type, destination_location_id, vendor_id, date, tab } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!type || !['transfer', 'order'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "transfer" or "order"' }, { status: 400 })
    }

    if (type === 'transfer' && !destination_location_id) {
      return NextResponse.json(
        { error: 'Destination location is required for transfers' },
        { status: 400 },
      )
    }

    if (type === 'order' && !vendor_id) {
      return NextResponse.json(
        { error: 'Vendor is required for orders' },
        { status: 400 },
      )
    }

    const manifest = await createManifest({
      organization_id: session.organizationId,
      source_location_id: session.locationId,
      title: title.trim(),
      type,
      destination_location_id: destination_location_id ?? undefined,
      vendor_id: vendor_id ?? undefined,
      date: date ?? undefined,
      tab: tab ?? 'wholesale',
      created_by: session.employeeId,
    })

    return NextResponse.json({ manifest }, { status: 201 })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      )
    }
    logger.error('Manifest create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
