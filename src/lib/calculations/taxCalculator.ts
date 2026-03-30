import { roundMoney } from '@/lib/utils/money'
import type {
  TaxLineItem,
  TaxRateConfig,
  TaxLineResult,
  TaxCalculationResult,
  AppliedRate,
} from './tax.types'

export function calculateTaxes(
  items: TaxLineItem[],
  taxRates: TaxRateConfig[],
): TaxCalculationResult {
  let totalExcise = 0
  let totalGrt = 0
  let totalTaxableAmount = 0

  const lineTaxes: TaxLineResult[] = items.map((item) => {
    const taxableAmount = Math.max(item.taxable_amount, 0)
    const lineBase = roundMoney(taxableAmount * item.quantity)
    totalTaxableAmount = roundMoney(totalTaxableAmount + lineBase)

    const applicableRates = taxRates.filter((rate) => {
      if (item.tax_category_id === null) return false
      if (rate.tax_category_id !== null && rate.tax_category_id !== item.tax_category_id) return false
      if (item.is_medical) return rate.applies_to === 'medical' || rate.applies_to === 'both'
      return rate.applies_to === 'recreational' || rate.applies_to === 'both'
    })

    let exciseAmount = 0
    let grtAmount = 0
    const appliedRates: AppliedRate[] = []

    for (const rate of applicableRates) {
      const amount = roundMoney(lineBase * rate.rate_percent)
      appliedRates.push({
        tax_rate_id: rate.id,
        name: rate.name,
        rate: rate.rate_percent,
        amount,
        is_excise: rate.is_excise,
      })
      if (rate.is_excise) {
        exciseAmount = roundMoney(exciseAmount + amount)
      } else {
        grtAmount = roundMoney(grtAmount + amount)
      }
    }

    totalExcise = roundMoney(totalExcise + exciseAmount)
    totalGrt = roundMoney(totalGrt + grtAmount)

    return {
      product_id: item.product_id,
      excise_amount: exciseAmount,
      grt_amount: grtAmount,
      total_tax: roundMoney(exciseAmount + grtAmount),
      applied_rates: appliedRates,
    }
  })

  const totalTax = roundMoney(totalExcise + totalGrt)
  const effectiveRate = totalTaxableAmount > 0 ? roundMoney(totalTax / totalTaxableAmount * 10000) / 10000 : 0

  return {
    line_taxes: lineTaxes,
    summary: {
      total_excise: totalExcise,
      total_grt: totalGrt,
      total_tax: totalTax,
      effective_rate: effectiveRate,
    },
  }
}
