import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { receiveManifest } from '@/lib/services/inventoryReceivingService'
import { acceptManifestTransfer } from '@/lib/biotrack/inventorySync'
import { logger } from '@/lib/utils/logger'
import type { ReceiveManifestInput } from '@/lib/biotrack/inventoryTypes'

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
    strain_id: z.uuid().nullable().optional(),
    lot_number: z.string().nullable().optional(),
    expiration_date: z.string().nullable().optional(),
    packaging_date: z.string().nullable().optional(),
    external_package_id: z.string().nullable().optional(),
    package_ndc: z.string().nullable().optional(),
    tax_per_unit: z.number().nullable().optional(),
    med_price: z.number().nullable().optional(),
    rec_price: z.number().nullable().optional(),
    flower_equivalent: z.number().nullable().optional(),
    inventory_status: z.string().nullable().optional(),
    tags: z.array(z.uuid()).optional(),
  })),
  vendor_id: z.uuid().nullable().optional(),
  producer_id: z.uuid().nullable().optional(),
  delivered_by: z.string().nullable().optional(),
  vendor_license: z.string().nullable().optional(),
  order_title: z.string().nullable().optional(),
  delivered_on: z.string().nullable().optional(),
  total_credits: z.number().nullable().optional(),
  shipping_charges: z.number().nullable().optional(),
  cost_option: z.enum(['none', 'divide_equally', 'by_weight']).optional(),
  notes: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = AcceptSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const data = parsed.data

    const result = await receiveManifest({
      organization_id: session.organizationId,
      location_id: session.locationId,
      employee_id: session.employeeId,
      manifest: data.manifest as ReceiveManifestInput['manifest'],
      accepted_items: data.items.map((item) => ({
        ...item,
        subroom_id: item.subroom_id ?? null,
        cost_per_unit: item.cost_per_unit ?? null,
        discrepancy_reason: item.discrepancy_reason ?? null,
        strain_id: item.strain_id ?? null,
        lot_number: item.lot_number ?? null,
        expiration_date: item.expiration_date ?? null,
        packaging_date: item.packaging_date ?? null,
        external_package_id: item.external_package_id ?? null,
        package_ndc: item.package_ndc ?? null,
        tax_per_unit: item.tax_per_unit ?? null,
        med_price: item.med_price ?? null,
        rec_price: item.rec_price ?? null,
        flower_equivalent: item.flower_equivalent ?? null,
        inventory_status: item.inventory_status ?? null,
        tags: item.tags ?? [],
      })),
      vendor_id: data.vendor_id ?? null,
      producer_id: data.producer_id ?? null,
      delivered_by: data.delivered_by ?? null,
      vendor_license: data.vendor_license ?? null,
      order_title: data.order_title ?? null,
      delivered_on: data.delivered_on ?? null,
      total_credits: data.total_credits ?? null,
      shipping_charges: data.shipping_charges ?? null,
      cost_option: data.cost_option ?? null,
      notes: data.notes ?? null,
    })

    // Fire-and-forget BioTrack acceptance
    acceptManifestTransfer(
      data.manifest.manifest_id,
      data.items.map((i) => ({ barcode: i.barcode, accepted_quantity: i.accepted_quantity })),
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

