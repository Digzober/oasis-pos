import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { initiateTransfer, listPendingTransfers } from '@/lib/services/inventoryTransferService'
import { logger } from '@/lib/utils/logger'

const TransferSchema = z.object({
  destination_location_id: z.uuid(),
  items: z.array(z.object({ inventory_item_id: z.uuid(), quantity: z.number().positive() })).min(1),
  notes: z.string().nullable().optional(),
})

export async function GET() {
  try {
    const session = await requireSession()
    const transfers = await listPendingTransfers(session.locationId)
    return NextResponse.json({ transfers })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Transfer list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = TransferSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })

    const result = await initiateTransfer({
      source_location_id: session.locationId,
      destination_location_id: parsed.data.destination_location_id,
      items: parsed.data.items,
      employee_id: session.employeeId,
      notes: parsed.data.notes ?? null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message, code: a.code }, { status: a.statusCode ?? 500 })
    }
    logger.error('Transfer create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
