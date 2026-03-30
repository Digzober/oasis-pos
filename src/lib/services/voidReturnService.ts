import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/utils/money'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export interface VoidResult {
  transactionId: string
  transactionNumber: number
  voidedTotal: number
  itemsRestored: number
}

export interface ReturnLineInput {
  transaction_line_id: string
  quantity: number
  restore_to_inventory: boolean
}

export interface ReturnResult {
  transactionId: string
  transactionNumber: number
  refundAmount: number
  originalTransactionId: string
}

export async function voidTransaction(
  transactionId: string,
  employeeId: string,
  reason: string,
  cashDrawerId: string,
): Promise<VoidResult> {
  const sb = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.rpc as any)('void_transaction', {
    p_transaction_id: transactionId,
    p_employee_id: employeeId,
    p_void_reason: reason,
    p_cash_drawer_id: cashDrawerId || null,
  })

  if (error) {
    logger.error('Void transaction failed', { transactionId, error: error.message })
    throw new AppError('VOID_FAILED', error.message, error, 400)
  }

  const result = data as { transaction_id: string; transaction_number: number; voided_total: number; items_restored: number }

  logger.info('Transaction voided', { transactionId, total: result.voided_total })

  // Fire-and-forget BioTrack void sync
  import('@/lib/biotrack/saleSync')
    .then(({ syncVoidToBioTrack }) => syncVoidToBioTrack(transactionId))
    .catch((err) => logger.error('BioTrack void sync trigger failed', { error: String(err) }))

  return {
    transactionId: result.transaction_id,
    transactionNumber: result.transaction_number,
    voidedTotal: result.voided_total,
    itemsRestored: result.items_restored,
  }
}

export async function processReturn(
  originalTransactionId: string,
  employeeId: string,
  cashDrawerId: string,
  reason: string,
  lines: ReturnLineInput[],
  locationId: string,
  registerId: string,
  organizationId: string,
): Promise<ReturnResult> {
  const sb = await createSupabaseServerClient()

  // Load original transaction to get customer and calculate refund
  const { data: origTx } = await sb
    .from('transactions')
    .select('id, customer_id, total, transaction_lines ( id, unit_price, quantity, discount_amount, line_total )')
    .eq('id', originalTransactionId)
    .single()

  if (!origTx) {
    throw new AppError('TRANSACTION_NOT_FOUND', 'Original transaction not found', undefined, 404)
  }

  // Calculate refund: proportional to what was actually paid per item
  const origLines = (origTx.transaction_lines ?? []) as Array<{
    id: string; unit_price: number; quantity: number; discount_amount: number; line_total: number
  }>

  let refundAmount = 0
  for (const rl of lines) {
    const origLine = origLines.find((ol) => ol.id === rl.transaction_line_id)
    if (!origLine) {
      throw new AppError('LINE_NOT_FOUND', `Transaction line ${rl.transaction_line_id} not found`, undefined, 400)
    }
    if (rl.quantity > origLine.quantity) {
      throw new AppError('INVALID_QUANTITY', `Return quantity exceeds original for line ${rl.transaction_line_id}`, undefined, 400)
    }
    const perUnit = roundMoney(origLine.line_total / origLine.quantity)
    refundAmount = roundMoney(refundAmount + perUnit * rl.quantity)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.rpc as any)('create_return_transaction', {
    p_organization_id: organizationId,
    p_location_id: locationId,
    p_employee_id: employeeId,
    p_register_id: registerId || null,
    p_customer_id: origTx.customer_id,
    p_cash_drawer_id: cashDrawerId || null,
    p_original_transaction_id: originalTransactionId,
    p_return_reason: reason,
    p_return_lines: lines,
    p_refund_amount: refundAmount,
  })

  if (error) {
    logger.error('Return transaction failed', { originalTransactionId, error: error.message })
    throw new AppError('RETURN_FAILED', error.message, error, 400)
  }

  const result = data as { transaction_id: string; transaction_number: number; refund_amount: number; original_transaction_id: string }

  logger.info('Return processed', { returnTxId: result.transaction_id, refundAmount: result.refund_amount })

  // Fire-and-forget BioTrack refund sync
  import('@/lib/biotrack/saleSync')
    .then(({ syncRefundToBioTrack }) => syncRefundToBioTrack(result.transaction_id, originalTransactionId))
    .catch((err) => logger.error('BioTrack refund sync trigger failed', { error: String(err) }))

  return {
    transactionId: result.transaction_id,
    transactionNumber: result.transaction_number,
    refundAmount: result.refund_amount,
    originalTransactionId: result.original_transaction_id,
  }
}
