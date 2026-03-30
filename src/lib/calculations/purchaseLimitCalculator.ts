import type {
  PurchaseLimitConfig,
  PurchaseLimitItem,
  PurchaseLimitResult,
  PurchaseLimitBreakdown,
} from './purchaseLimit.types'

const GRAMS_PER_OZ = 28.35

export function checkPurchaseLimit(
  items: PurchaseLimitItem[],
  limits: PurchaseLimitConfig[],
  customerType: 'recreational' | 'medical',
): PurchaseLimitResult {
  // Medical: defer to BioTrack allotment
  if (customerType === 'medical') {
    return {
      allowed: true,
      current_flower_equivalent_oz: 0,
      limit_oz: 0,
      remaining_oz: 0,
      percentage_used: 0,
      breakdown: [],
      message: 'Medical limits verified via BioTrack allotment',
    }
  }

  if (items.length === 0) {
    const limit = findLimit(limits, 'flower', customerType)
    return {
      allowed: true,
      current_flower_equivalent_oz: 0,
      limit_oz: limit?.limit_amount ?? 0,
      remaining_oz: limit?.limit_amount ?? 0,
      percentage_used: 0,
      breakdown: [],
      message: 'Cart is empty',
    }
  }

  // Find the transaction limit (use flower as the primary limit reference)
  const primaryLimit = findLimit(limits, 'flower', customerType)
  const limitOz = primaryLimit?.limit_amount ?? 2.0

  const breakdown: PurchaseLimitBreakdown[] = []
  let totalEquivOz = 0

  for (const item of items) {
    if (item.quantity <= 0) continue

    const cat = mapCategory(item.purchase_limit_category)
    if (!cat) continue // non_cannabis, topical, accessory — skip

    const config = findLimit(limits, cat, customerType)
    const equivOz = calculateEquivalentOz(item, cat, config)

    if (equivOz > 0) {
      breakdown.push({
        product_id: item.product_id,
        category_type: cat,
        flower_equivalent_oz: round4(equivOz),
      })
      totalEquivOz += equivOz
    }
  }

  totalEquivOz = round4(totalEquivOz)
  const remaining = round4(Math.max(0, limitOz - totalEquivOz))
  const pctUsed = limitOz > 0 ? round2((totalEquivOz / limitOz) * 100) : 0
  const allowed = totalEquivOz <= limitOz

  return {
    allowed,
    current_flower_equivalent_oz: totalEquivOz,
    limit_oz: limitOz,
    remaining_oz: remaining,
    percentage_used: pctUsed,
    breakdown,
    message: allowed
      ? `${round2(pctUsed)}% of purchase limit used (${round4(totalEquivOz)} / ${limitOz} oz)`
      : `Exceeds purchase limit: ${round4(totalEquivOz)} oz of ${limitOz} oz allowed`,
  }
}

function mapCategory(
  cat: PurchaseLimitItem['purchase_limit_category'],
): 'flower' | 'concentrate' | 'edible' | null {
  switch (cat) {
    case 'flower': return 'flower'
    case 'concentrate': return 'concentrate'
    case 'edible': return 'edible'
    default: return null
  }
}

function findLimit(
  limits: PurchaseLimitConfig[],
  categoryType: string,
  customerType: string,
): PurchaseLimitConfig | undefined {
  return limits.find(
    (l) =>
      l.category_type === categoryType &&
      (l.customer_type === customerType || l.customer_type === 'both'),
  )
}

function calculateEquivalentOz(
  item: PurchaseLimitItem,
  category: 'flower' | 'concentrate' | 'edible',
  config: PurchaseLimitConfig | undefined,
): number {
  switch (category) {
    case 'flower': {
      const weight = item.weight_grams * item.quantity
      return weight / GRAMS_PER_OZ
    }
    case 'concentrate': {
      const ratio = config?.equivalency_ratio ?? 3.54375
      const weight = item.weight_grams * item.quantity
      // ratio grams concentrate = 1 gram flower equivalent
      // so flower_equiv_grams = weight / ratio
      // flower_equiv_oz = flower_equiv_grams / GRAMS_PER_OZ
      return (weight * ratio) / GRAMS_PER_OZ
    }
    case 'edible': {
      const thcMg = (item.thc_mg ?? 0) * item.quantity
      // 800mg THC = 1 oz flower equivalent
      return thcMg / 800
    }
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
