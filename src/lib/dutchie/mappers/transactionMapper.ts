import type { DutchieTransaction } from '../types'

type TransactionType = 'sale' | 'return' | 'void' | 'exchange'
type TransactionStatus = 'pending' | 'completed' | 'voided' | 'returned'
type PaymentMethod = 'cash' | 'debit' | 'credit' | 'epay' | 'check' | 'loyalty' | 'coupon'

const TYPE_MAP: Record<string, TransactionType> = {
  sale: 'sale',
  wholesaleorder: 'sale',
  return: 'return',
  refund: 'return',
  void: 'void',
  exchange: 'exchange',
}

export interface MappedTransaction {
  location_id: string
  dutchie_transaction_id: string
  transaction_type: TransactionType
  status: TransactionStatus
  subtotal: number
  tax_amount: number
  discount_amount: number
  total: number
  is_medical: boolean
  customer_id: string | null
  employee_id: string | null
  created_at: string
  notes: string | null
  order_source: string
}

export interface MappedPayment {
  payment_method: PaymentMethod
  amount: number
}

export function mapTransaction(
  source: DutchieTransaction,
  locationId: string,
): { transaction: MappedTransaction; payments: MappedPayment[] } {
  const raw = source as Record<string, unknown>
  const rawType = String(source.transactionType ?? 'Sale').toLowerCase().replace(/\s+/g, '')
  const transactionType = TYPE_MAP[rawType] ?? 'sale'

  const isVoid = raw.isVoid === true
  const isReturn = raw.isReturn === true
  const status: TransactionStatus = isVoid ? 'voided' : isReturn ? 'returned' : 'completed'

  const isMedical = raw.isMedical === true

  const transaction: MappedTransaction = {
    location_id: locationId,
    dutchie_transaction_id: String(source.transactionId),
    transaction_type: isReturn ? 'return' : isVoid ? 'void' : transactionType,
    status,
    subtotal: Number(raw.subtotal ?? raw.totalBeforeTax ?? 0),
    tax_amount: Number(raw.tax ?? source.taxAmount ?? 0),
    discount_amount: Number(raw.totalDiscount ?? source.discountAmount ?? 0),
    total: Number(source.total ?? 0),
    is_medical: isMedical,
    customer_id: null,
    employee_id: null,
    created_at: String(source.transactionDate ?? raw.transactionDateLocalTime ?? new Date().toISOString()),
    notes: raw.invoiceName as string | null ?? null,
    order_source: String(raw.orderSource ?? 'dutchie'),
  }

  // Build payments from the paid-by-method fields
  const payments: MappedPayment[] = []
  const addPayment = (method: PaymentMethod, amount: unknown) => {
    const num = Number(amount)
    if (num > 0) payments.push({ payment_method: method, amount: num })
  }

  addPayment('cash', raw.cashPaid)
  addPayment('debit', raw.debitPaid)
  addPayment('credit', raw.creditPaid)
  addPayment('epay', raw.electronicPaid)
  addPayment('check', raw.checkPaid)

  // If no specific payments found, use total as cash
  if (payments.length === 0 && transaction.total > 0) {
    payments.push({ payment_method: 'cash', amount: transaction.total })
  }

  return { transaction, payments }
}
