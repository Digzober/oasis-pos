export interface PurchaseLimitConfig {
  category_type: 'flower' | 'concentrate' | 'edible' | 'non_cannabis'
  customer_type: 'recreational' | 'medical' | 'both'
  limit_amount: number
  equivalency_ratio: number
  time_period: 'per_transaction' | 'daily'
}

export interface PurchaseLimitItem {
  product_id: string
  purchase_limit_category: 'flower' | 'concentrate' | 'edible' | 'topical' | 'accessory' | 'non_cannabis'
  quantity: number
  weight_grams: number
  thc_mg: number | null
  is_medical: boolean
}

export interface PurchaseLimitBreakdown {
  product_id: string
  category_type: string
  flower_equivalent_oz: number
}

export interface PurchaseLimitResult {
  allowed: boolean
  current_flower_equivalent_oz: number
  limit_oz: number
  remaining_oz: number
  percentage_used: number
  breakdown: PurchaseLimitBreakdown[]
  message: string
}
