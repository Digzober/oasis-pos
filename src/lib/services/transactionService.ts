import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/utils/money'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { calculateTaxes } from '@/lib/calculations/taxCalculator'
import { evaluateDiscounts } from '@/lib/calculations/discountEvaluator'
import { checkPurchaseLimit } from '@/lib/calculations/purchaseLimitCalculator'
import { loadTaxRatesForLocation } from '@/lib/calculations/taxRateLoader'
import { loadActiveDiscounts } from '@/lib/calculations/discountLoader'
import { loadPurchaseLimits } from '@/lib/calculations/purchaseLimitLoader'
import type { DiscountableItem, DiscountEvaluationContext } from '@/lib/calculations/discount.types'
import type { PurchaseLimitItem } from '@/lib/calculations/purchaseLimit.types'

export interface CreateTransactionInput {
  organization_id: string
  location_id: string
  employee_id: string
  register_id: string
  cash_drawer_id: string
  customer_id: string | null
  is_medical: boolean
  items: Array<{
    product_id: string
    inventory_item_id: string
    quantity: number
  }>
  amount_tendered: number
  payment_method: string
  manual_discount_ids: string[]
}

export async function createSaleTransaction(
  input: CreateTransactionInput,
): Promise<{ transactionId: string; transactionNumber: number; changeDue: number }> {
  const sb = await createSupabaseServerClient()

  // 1. Load fresh product data
  const productIds = input.items.map((i) => i.product_id)
  const inventoryIds = input.items.map((i) => i.inventory_item_id)

  const [{ data: products }, { data: inventory }] = await Promise.all([
    sb.from('products').select('id, name, sku, rec_price, med_price, is_cannabis, weight_grams, thc_content_mg, flower_equivalent, category_id, brand_id, vendor_id, strain_id, product_categories ( name, purchase_limit_category, tax_category )').in('id', productIds),
    sb.from('inventory_items').select('id, biotrack_barcode, quantity, quantity_reserved').in('id', inventoryIds),
  ])

  if (!products || products.length !== productIds.length) {
    throw new AppError('PRODUCTS_NOT_FOUND', 'One or more products not found', undefined, 400)
  }

  const productMap = new Map(products.map((p) => [p.id, p]))
  const inventoryMap = new Map((inventory ?? []).map((i) => [i.id, i]))

  // Validate inventory
  for (const item of input.items) {
    const inv = inventoryMap.get(item.inventory_item_id)
    if (!inv) throw new AppError('INVENTORY_NOT_FOUND', `Inventory item ${item.inventory_item_id} not found`, undefined, 400)
    const available = inv.quantity - inv.quantity_reserved
    if (available < item.quantity) {
      const prod = productMap.get(item.product_id)
      throw new AppError('INSUFFICIENT_INVENTORY', `Insufficient inventory for ${prod?.name ?? item.product_id}`, undefined, 400)
    }
  }

  // 2. Load config
  const [taxRates, discounts, purchaseLimits] = await Promise.all([
    loadTaxRatesForLocation(input.location_id),
    loadActiveDiscounts(input.organization_id),
    loadPurchaseLimits(input.organization_id, input.location_id),
  ])

  // 3. Build enriched items for calculations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedItems = input.items.map((item) => {
    const prod = productMap.get(item.product_id)!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat = (prod as any).product_categories as { name: string; purchase_limit_category: string | null; tax_category: string } | null
    const price = input.is_medical ? (prod.med_price ?? prod.rec_price) : prod.rec_price
    return {
      ...item,
      product: prod,
      category: cat,
      unitPrice: price,
    }
  })

  // 4. Evaluate discounts server-side
  const discountableItems: DiscountableItem[] = enrichedItems.map((e, i) => ({
    cart_line_id: `line-${i}`,
    product_id: e.product_id,
    inventory_item_id: e.inventory_item_id,
    brand_id: e.product.brand_id,
    vendor_id: e.product.vendor_id,
    strain_id: e.product.strain_id,
    category_id: e.product.category_id,
    pricing_tier_id: null,
    product_tag_ids: [],
    inventory_tag_ids: [],
    weight_descriptor: null,
    weight_grams: e.product.weight_grams,
    quantity: e.quantity,
    unit_price: e.unitPrice,
    is_medical: input.is_medical,
  }))

  const discountContext: DiscountEvaluationContext = {
    location_id: input.location_id,
    customer_type: input.is_medical ? 'medical' : 'recreational',
    customer_group_ids: [],
    segment_ids: [],
    is_first_time: false,
    customer_id: input.customer_id,
    customer_use_counts: new Map(),
    now: new Date(),
  }

  // Include manual discounts
  const discountsToEval = discounts.map((d) => {
    if (input.manual_discount_ids.includes(d.id)) return { ...d, discount_type: 'automatic' as const }
    return d
  })

  const discountResult = evaluateDiscounts(discountableItems, discountsToEval, discountContext)

  // 5. Calculate per-line amounts
  const lineData = enrichedItems.map((e, i) => {
    const lineId = `line-${i}`
    const perUnitDiscount = discountResult.item_discounts.get(lineId) ?? 0
    const taxablePerUnit = roundMoney(e.unitPrice - perUnitDiscount)
    return { ...e, perUnitDiscount, taxablePerUnit, lineId }
  })

  // 6. Calculate taxes server-side
  const taxItems = lineData.map((l) => ({
    product_id: l.product_id,
    tax_category_id: l.category?.tax_category === 'Cannabis' ? findCannabisCategory(taxRates) : findNonCannabisCategory(taxRates),
    is_medical: input.is_medical,
    taxable_amount: l.taxablePerUnit,
    quantity: l.quantity,
  }))

  const taxResult = calculateTaxes(taxItems, taxRates)

  // 7. Compute totals
  const subtotal = lineData.reduce((s, l) => roundMoney(s + l.unitPrice * l.quantity), 0)
  const discountTotal = roundMoney(lineData.reduce((s, l) => s + l.perUnitDiscount * l.quantity, 0))
  const taxTotal = taxResult.summary.total_tax
  const total = roundMoney(subtotal - discountTotal + taxTotal)

  // 8. Validate tender
  if (input.amount_tendered < total) {
    throw new AppError('INSUFFICIENT_TENDER', `Amount tendered ($${input.amount_tendered}) is less than total ($${total})`, undefined, 400)
  }

  const changeDue = roundMoney(input.amount_tendered - total)

  // 9. Check purchase limits server-side
  const limitItems: PurchaseLimitItem[] = lineData.map((l) => ({
    product_id: l.product_id,
    purchase_limit_category: (l.category?.purchase_limit_category ?? 'non_cannabis') as PurchaseLimitItem['purchase_limit_category'],
    quantity: l.quantity,
    weight_grams: l.product.weight_grams ?? 0,
    thc_mg: l.product.thc_content_mg,
    is_medical: input.is_medical,
  }))

  const limitCheck = checkPurchaseLimit(limitItems, purchaseLimits, input.is_medical ? 'medical' : 'recreational')
  if (!limitCheck.allowed) {
    throw new AppError('PURCHASE_LIMIT_EXCEEDED', limitCheck.message, undefined, 400)
  }

  // 10. Build JSONB payloads
  const linesPayload = lineData.map((l, i) => {
    const inv = inventoryMap.get(l.inventory_item_id)
    const lineTax = taxResult.line_taxes[i]?.total_tax ?? 0
    const lineTotal = roundMoney(l.unitPrice * l.quantity - l.perUnitDiscount * l.quantity + lineTax)
    return {
      product_id: l.product_id,
      inventory_item_id: l.inventory_item_id,
      product_name: l.product.name,
      category_name: l.category?.name ?? null,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      discount_amount: roundMoney(l.perUnitDiscount * l.quantity),
      tax_amount: lineTax,
      line_total: lineTotal,
      is_cannabis: l.product.is_cannabis,
      weight_grams: l.product.weight_grams,
      flower_equivalent_grams: l.product.flower_equivalent ? l.product.flower_equivalent * l.quantity : null,
      biotrack_barcode: inv?.biotrack_barcode ?? null,
    }
  })

  const paymentsPayload = [{
    payment_method: input.payment_method,
    amount: total,
    tendered: input.amount_tendered,
    change_given: changeDue,
    reference_number: null,
  }]

  const taxesPayload = taxResult.line_taxes.flatMap((lt) =>
    lt.applied_rates.map((r) => ({
      tax_name: r.name,
      tax_rate: r.rate,
      taxable_amount: roundMoney(r.amount / r.rate), // reconstruct taxable
      tax_amount: r.amount,
      is_excise: r.is_excise,
    })),
  )

  // Deduplicate taxes by name
  const taxAgg = new Map<string, { tax_name: string; tax_rate: number; taxable_amount: number; tax_amount: number; is_excise: boolean }>()
  for (const t of taxesPayload) {
    const existing = taxAgg.get(t.tax_name)
    if (existing) {
      existing.taxable_amount = roundMoney(existing.taxable_amount + t.taxable_amount)
      existing.tax_amount = roundMoney(existing.tax_amount + t.tax_amount)
    } else {
      taxAgg.set(t.tax_name, { ...t })
    }
  }

  const discountsPayload = discountResult.applied_discounts.map((d) => ({
    discount_id: d.discount_id,
    discount_name: d.discount_name,
    discount_amount: d.total_savings,
  }))

  // 11. Load loyalty config
  let loyaltyPoints = 0
  if (input.customer_id) {
    const { data: loyaltyConfig } = await sb
      .from('loyalty_config')
      .select('accrual_rate, is_active')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (loyaltyConfig) {
      loyaltyPoints = Math.floor(total * loyaltyConfig.accrual_rate)
    }
  }

  // 12. Call the atomic RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcResult, error: rpcError } = await (sb.rpc as any)('create_sale_transaction', {
    p_location_id: input.location_id,
    p_employee_id: input.employee_id,
    p_register_id: input.register_id,
    p_customer_id: input.customer_id,
    p_cash_drawer_id: input.cash_drawer_id,
    p_is_medical: input.is_medical,
    p_subtotal: subtotal,
    p_discount_total: discountTotal,
    p_tax_total: taxTotal,
    p_total: total,
    p_lines: linesPayload,
    p_payments: paymentsPayload,
    p_taxes: Array.from(taxAgg.values()),
    p_discounts: discountsPayload,
    p_loyalty_points: loyaltyPoints,
    p_organization_id: input.organization_id,
  })

  if (rpcError) {
    logger.error('Transaction RPC failed', { error: rpcError.message })
    throw new AppError('TRANSACTION_FAILED', rpcError.message, rpcError, 500)
  }

  const result = rpcResult as { transaction_id: string; transaction_number: number }

  logger.info('Transaction created', {
    transactionId: result.transaction_id,
    transactionNumber: result.transaction_number,
    total,
  })

  // 13. Fire-and-forget BioTrack sync
  import('@/lib/biotrack/saleSync')
    .then(({ syncSaleToBioTrack }) => syncSaleToBioTrack(result.transaction_id))
    .catch((err) => logger.error('BioTrack sync trigger failed', { error: String(err) }))

  return {
    transactionId: result.transaction_id,
    transactionNumber: result.transaction_number,
    changeDue,
  }
}

function findCannabisCategory(rates: Array<{ tax_category_id: string | null }>): string | null {
  return rates.find((r) => r.tax_category_id !== null)?.tax_category_id ?? null
}

function findNonCannabisCategory(rates: Array<{ tax_category_id: string | null }>): string | null {
  return rates.find((r) => r.tax_category_id !== null)?.tax_category_id ?? null
}
