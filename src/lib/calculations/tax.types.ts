export interface TaxLineItem {
  product_id: string
  tax_category_id: string | null
  is_medical: boolean
  taxable_amount: number
  quantity: number
}

export interface TaxRateConfig {
  id: string
  name: string
  rate_percent: number
  is_excise: boolean
  applies_to: 'recreational' | 'medical' | 'both'
  tax_category_id: string | null
}

export interface AppliedRate {
  tax_rate_id: string
  name: string
  rate: number
  amount: number
  is_excise: boolean
}

export interface TaxLineResult {
  product_id: string
  excise_amount: number
  grt_amount: number
  total_tax: number
  applied_rates: AppliedRate[]
}

export interface TaxCalculationResult {
  line_taxes: TaxLineResult[]
  summary: {
    total_excise: number
    total_grt: number
    total_tax: number
    effective_rate: number
  }
}
