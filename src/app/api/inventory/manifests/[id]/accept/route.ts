import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { receiveManifest } from '@/lib/services/inventoryReceivingService'
import { acceptManifestTransfer } from '@/lib/biotrack/inventorySync'
import { logger } from '@/lib/utils/logger'

const AcceptSchema = z.object({
  manifest: z.object({
    manifest_id: z.string(),
    sender_license: z.string(),
    sender_name: z.string(),
    transfer_date: z.string(),
    items: z.array(z.object({
      barcode: z.string(),
      product_name: z.string(),
      quantity: z.number(),
      weight: z.number(),
      category: z.string(),
      batch_number: z.string(),
      lab_results: z.unknown().nullable(),
      thc_percentage: z.number().nullable().optional(),
      cbd_percentage: z.number().nullable().optional(),
    })),
    status: z.string(),
  }),
  items: z.array(z.object({
    barcode: z.string(),
    accepted_quantity: z.number(),
    actual_quantity: z.number(),
    product_id: z.uuid(),
    room_id: z.uuid(),
    subroom_id: z.uuid().nullable().optional(),
    cost_per_unit: z.number().nullable().optional(),
    discrepancy_reason: z.string().nullable().optional(),
  })),
  vendor_id: z.uuid().nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = AcceptSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    // Receive into local inventory
    const result = await receiveManifest({
      organization_id: session.organizationId,
      location_id: session.locationId,
      employee_id: session.employeeId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      manifest: parsed.data.manifest as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accepted_items: parsed.data.items as any,
      vendor_id: parsed.data.vendor_id ?? null,
    })

    // Fire-and-forget BioTrack acceptance
    acceptManifestTransfer(
      parsed.data.manifest.manifest_id,
      parsed.data.items.map((i) => ({ barcode: i.barcode, accepted_quantity: i.accepted_quantity })),
      session.organizationId,
    ).catch((err) => logger.error('BioTrack manifest accept failed', { error: String(err) }))

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message, code: a.code }, { status: a.statusCode ?? 500 })
    }
    logger.error('Manifest accept error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
