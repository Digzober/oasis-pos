import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { getBioTrackClientForLocation } from './client'
import { isBioTrackEnabled, loadBioTrackConfig } from './configLoader'
import type { SaleDispensePayload, SaleVoidPayload, SaleRefundPayload } from './types'

async function getSyncContext(locationId: string) {
  const [config, client] = await Promise.all([
    loadBioTrackConfig(locationId),
    getBioTrackClientForLocation(locationId),
  ])
  if (!config || !client) {
    logger.error('BioTrack credentials are not configured', { locationId })
    return null
  }
  return { client, licenseNumber: config.licenseNumber }
}

export async function syncSaleToBioTrack(transactionId: string): Promise<void> {
  const sb = await createSupabaseServerClient()

  const { data: tx, error: txErr } = await sb
    .from('transactions')
    .select('*, transaction_lines ( * )')
    .eq('id', transactionId)
    .single()

  if (txErr || !tx) {
    logger.error('Sale sync: transaction not found', { transactionId })
    return
  }

  if (!(await isBioTrackEnabled(tx.location_id))) {
    logger.info('Sale sync: BioTrack disabled for location, skipping', {
      transactionId,
      locationId: tx.location_id,
    })
    return
  }

  const lines = (tx.transaction_lines ?? []) as Array<{
    biotrack_barcode: string | null
    quantity: number
    unit_price: number
    discount_amount: number
    line_total: number
  }>

  const itemsWithBarcode = lines.filter((l) => l.biotrack_barcode)
  if (itemsWithBarcode.length === 0) {
    logger.warn('Sale sync: no items with biotrack barcode, skipping', { transactionId })
    return
  }

  if (itemsWithBarcode.length < lines.length) {
    logger.warn('Sale sync: some items missing biotrack barcode', {
      transactionId,
      total: lines.length,
      withBarcode: itemsWithBarcode.length,
    })
  }

  const syncContext = await getSyncContext(tx.location_id)
  if (!syncContext) return

  const payload: SaleDispensePayload = {
    license_number: syncContext.licenseNumber,
    sale_date: tx.created_at,
    patient_type: tx.is_medical ? 'medical' : 'recreational',
    patient_id: null,
    items: itemsWithBarcode.map((l) => ({
      barcode: l.biotrack_barcode!,
      quantity: l.quantity,
      unit_price: l.unit_price,
      discount: l.discount_amount,
      total: l.line_total,
    })),
    total_amount: tx.total,
    tax_amount: tx.tax_amount,
    transaction_id: transactionId,
  }

  try {
    const response = await syncContext.client.call('sales/dispense', payload as unknown as Record<string, unknown>, {
      organizationId: '',
      locationId: tx.location_id,
      entityType: 'transaction',
      entityId: transactionId,
    })

    const saleId = (response.data as { sale_id?: string })?.sale_id ?? null

    await sb
      .from('transactions')
      .update({
        biotrack_transaction_id: saleId,
        biotrack_synced: true,
        biotrack_synced_at: new Date().toISOString(),
        biotrack_sync_error: null,
      })
      .eq('id', transactionId)

    logger.info('Sale synced to BioTrack', { transactionId, saleId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    // Check for duplicate — treat as success
    if (message.includes('duplicate') || message.includes('already exists')) {
      logger.info('Sale already synced to BioTrack (duplicate)', { transactionId })
      await sb
        .from('transactions')
        .update({
          biotrack_synced: true,
          biotrack_synced_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
      return
    }

    await sb
      .from('transactions')
      .update({
        biotrack_synced: false,
        biotrack_sync_error: message,
      })
      .eq('id', transactionId)

    logger.error('Sale sync failed', { transactionId, error: message })
  }
}

export async function syncVoidToBioTrack(transactionId: string): Promise<void> {
  const sb = await createSupabaseServerClient()

  const { data: tx } = await sb
    .from('transactions')
    .select('id, biotrack_transaction_id, void_reason, location_id')
    .eq('id', transactionId)
    .single()

  if (!tx?.biotrack_transaction_id) {
    logger.warn('Void sync: no biotrack_transaction_id, skipping', { transactionId })
    return
  }

  if (!(await isBioTrackEnabled(tx.location_id))) {
    logger.info('Void sync: BioTrack disabled for location, skipping', {
      transactionId,
      locationId: tx.location_id,
    })
    return
  }

  const syncContext = await getSyncContext(tx.location_id)
  if (!syncContext) return

  const payload: SaleVoidPayload = {
    license_number: syncContext.licenseNumber,
    original_sale_id: tx.biotrack_transaction_id,
    void_reason: tx.void_reason ?? 'Voided',
  }

  try {
    await syncContext.client.call('sales/void', payload as unknown as Record<string, unknown>, {
      organizationId: '',
      locationId: tx.location_id,
      entityType: 'transaction_void',
      entityId: transactionId,
    })

    logger.info('Void synced to BioTrack', { transactionId })
  } catch (err) {
    logger.error('Void sync failed', { transactionId, error: String(err) })
  }
}

export async function syncRefundToBioTrack(
  returnTransactionId: string,
  originalTransactionId: string,
): Promise<void> {
  const sb = await createSupabaseServerClient()

  const { data: originalTx } = await sb
    .from('transactions')
    .select('biotrack_transaction_id, location_id')
    .eq('id', originalTransactionId)
    .single()

  if (!originalTx?.biotrack_transaction_id) {
    logger.warn('Refund sync: original has no biotrack_transaction_id', { originalTransactionId })
    return
  }

  if (!(await isBioTrackEnabled(originalTx.location_id))) {
    logger.info('Refund sync: BioTrack disabled for location, skipping', {
      originalTransactionId,
      returnTransactionId,
      locationId: originalTx.location_id,
    })
    return
  }

  const { data: returnTx } = await sb
    .from('transactions')
    .select('*, transaction_lines ( * )')
    .eq('id', returnTransactionId)
    .single()

  if (!returnTx) {
    logger.error('Refund sync: return transaction not found', { returnTransactionId })
    return
  }

  const syncContext = await getSyncContext(originalTx.location_id)
  if (!syncContext) return

  const lines = (returnTx.transaction_lines ?? []) as Array<{
    biotrack_barcode: string | null
    quantity: number
    line_total: number
  }>

  const payload: SaleRefundPayload = {
    license_number: syncContext.licenseNumber,
    original_sale_id: originalTx.biotrack_transaction_id,
    refund_items: lines
      .filter((l) => l.biotrack_barcode)
      .map((l) => ({
        barcode: l.biotrack_barcode!,
        quantity: l.quantity,
        refund_amount: Math.abs(l.line_total),
      })),
    refund_reason: returnTx.notes ?? 'Return',
  }

  try {
    await syncContext.client.call('sales/refund', payload as unknown as Record<string, unknown>, {
      organizationId: '',
      locationId: originalTx.location_id,
      entityType: 'transaction_refund',
      entityId: returnTransactionId,
    })

    logger.info('Refund synced to BioTrack', { returnTransactionId, originalTransactionId })
  } catch (err) {
    logger.error('Refund sync failed', { returnTransactionId, error: String(err) })
  }
}
