import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { manualReceive } from '@/lib/services/inventoryReceivingService'
import { logger } from '@/lib/utils/logger'

const ManualReceiveSchema = z.object({
  product_id: z.uuid(),
  room_id: z.uuid(),
  subroom_id: z.uuid().nullable().optional(),
  quantity: z.number().positive(),
  cost_per_unit: z.number().nullable().optional(),
  barcode: z.string().nullable().optional(),
  batch_id: z.string().nullable().optional(),
  lot_number: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  vendor_id: z.uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  strain_id: z.uuid().nullable().optional(),
  flower_equivalent: z.number().nullable().optional(),
  med_price: z.number().nullable().optional(),
  rec_price: z.number().nullable().optional(),
  inventory_status: z.string().nullable().optional(),
  tags: z.array(z.uuid()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = ManualReceiveSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const item = await manualReceive({
      organization_id: session.organizationId,
      location_id: session.locationId,
      employee_id: session.employeeId,
      ...parsed.data,
      subroom_id: parsed.data.subroom_id ?? null,
      cost_per_unit: parsed.data.cost_per_unit ?? null,
      barcode: parsed.data.barcode ?? null,
      batch_id: parsed.data.batch_id ?? null,
      lot_number: parsed.data.lot_number ?? null,
      expiration_date: parsed.data.expiration_date ?? null,
      vendor_id: parsed.data.vendor_id ?? null,
      notes: parsed.data.notes ?? null,
      strain_id: parsed.data.strain_id ?? null,
      flower_equivalent: parsed.data.flower_equivalent ?? null,
      med_price: parsed.data.med_price ?? null,
      rec_price: parsed.data.rec_price ?? null,
      inventory_status: parsed.data.inventory_status ?? null,
      tags: parsed.data.tags ?? [],
    })

    return NextResponse.json({ inventory_item: item }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message, code: a.code }, { status: a.statusCode ?? 500 })
    }
    logger.error('Manual receive error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
