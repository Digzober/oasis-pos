import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import type { ReceiveManifestInput, ManualReceiveInput, ReceiveResult } from '@/lib/biotrack/inventoryTypes'

export async function receiveManifest(input: ReceiveManifestInput): Promise<ReceiveResult> {
  const sb = await createSupabaseServerClient()
  const inventoryIds: string[] = []
  let discrepancies = 0

  for (const item of input.accepted_items) {
    // Find manifest item data for lab results
    const manifestItem = input.manifest.items.find((mi) => mi.barcode === item.barcode)

    const hasDiscrepancy = item.actual_quantity !== item.accepted_quantity
    if (hasDiscrepancy) discrepancies++

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invItem, error } = await (sb.from('inventory_items') as any)
      .insert({
        location_id: input.location_id,
        product_id: item.product_id,
        room_id: item.room_id,
        subroom_id: item.subroom_id,
        vendor_id: input.vendor_id,
        biotrack_barcode: item.barcode,
        batch_id: manifestItem?.batch_number ?? null,
        quantity: item.actual_quantity,
        cost_per_unit: item.cost_per_unit,
        received_at: new Date().toISOString(),
        received_by: input.employee_id,
        testing_status: manifestItem?.lab_results ? 'passed' : 'pending',
        lab_test_results: manifestItem?.lab_results ?? null,
        strain_id: item.strain_id,
        lot_number: item.lot_number,
        expiration_date: item.expiration_date,
        packaging_date: item.packaging_date,
        external_package_id: item.external_package_id,
        package_ndc: item.package_ndc,
        flower_equivalent_grams: item.flower_equivalent,
        med_price: item.med_price,
        rec_price: item.rec_price,
        inventory_status: item.inventory_status,
        thc_content: manifestItem?.thc_percentage ?? null,
        cbd_content: manifestItem?.cbd_percentage ?? null,
      })
      .select('id')
      .single()

    if (error) {
      logger.error('Failed to create inventory item', { error: error.message, barcode: item.barcode })
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        throw new AppError('DUPLICATE_BARCODE', `Barcode ${item.barcode} already exists at this location`, error, 409)
      }
      throw new AppError('RECEIVE_FAILED', `Failed to receive item ${item.barcode}`, error, 500)
    }

    inventoryIds.push(invItem.id)

    // Insert tags into inventory_item_tags junction table
    if (item.tags.length > 0) {
      const tagRows = item.tags.map((tagId) => ({
        inventory_item_id: invItem.id,
        tag_id: tagId,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: tagError } = await (sb.from('inventory_item_tags') as any)
        .insert(tagRows)

      if (tagError) {
        logger.error('Failed to insert inventory item tags', {
          error: tagError.message,
          inventory_item_id: invItem.id,
          tag_count: item.tags.length,
        })
      }
    }

    // Audit log
    await sb.from('audit_log').insert({
      organization_id: input.organization_id,
      location_id: input.location_id,
      employee_id: input.employee_id,
      entity_type: 'inventory_item',
      event_type: 'receive',
      entity_id: invItem.id,
      metadata: {
        manifest_id: input.manifest.manifest_id,
        barcode: item.barcode,
        quantity: item.actual_quantity,
        discrepancy: hasDiscrepancy,
        discrepancy_reason: item.discrepancy_reason,
        vendor_id: input.vendor_id,
        producer_id: input.producer_id,
        order_title: input.order_title,
        notes: input.notes,
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }

  logger.info('Manifest received', {
    manifestId: input.manifest.manifest_id,
    itemsReceived: inventoryIds.length,
    discrepancies,
  })

  return {
    items_received: inventoryIds.length,
    discrepancies,
    inventory_ids: inventoryIds,
  }
}

export async function manualReceive(input: ManualReceiveInput) {
  const sb = await createSupabaseServerClient()

  const { data: invItem, error } = await sb
    .from('inventory_items')
    .insert({
      location_id: input.location_id,
      product_id: input.product_id,
      room_id: input.room_id,
      subroom_id: input.subroom_id,
      vendor_id: input.vendor_id,
      biotrack_barcode: input.barcode,
      batch_id: input.batch_id,
      lot_number: input.lot_number,
      quantity: input.quantity,
      cost_per_unit: input.cost_per_unit,
      expiration_date: input.expiration_date,
      received_at: new Date().toISOString(),
      received_by: input.employee_id,
      testing_status: 'exempt',
      strain_id: input.strain_id,
      flower_equivalent_grams: input.flower_equivalent,
      med_price: input.med_price,
      rec_price: input.rec_price,
      inventory_status: input.inventory_status,
    })
    .select()
    .single()

  if (error) {
    logger.error('Manual receive failed', { error: error.message })
    throw new AppError('RECEIVE_FAILED', 'Failed to receive inventory', error, 500)
  }

  // Insert tags into inventory_item_tags junction table
  if (input.tags.length > 0) {
    const tagRows = input.tags.map((tagId) => ({
      inventory_item_id: invItem.id,
      tag_id: tagId,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: tagError } = await (sb.from('inventory_item_tags') as any)
      .insert(tagRows)

    if (tagError) {
      logger.error('Failed to insert inventory item tags for manual receive', {
        error: tagError.message,
        inventory_item_id: invItem.id,
        tag_count: input.tags.length,
      })
    }
  }

  await sb.from('audit_log').insert({
    organization_id: input.organization_id,
    location_id: input.location_id,
    employee_id: input.employee_id,
    entity_type: 'inventory_item',
    event_type: 'manual_receive',
    entity_id: invItem.id,
    metadata: { quantity: input.quantity, notes: input.notes },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  return invItem
}
