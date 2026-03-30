export interface DiscountableItem {
  cart_line_id: string
  product_id: string
  inventory_item_id: string
  brand_id: string | null
  vendor_id: string | null
  strain_id: string | null
  category_id: string
  pricing_tier_id: string | null
  product_tag_ids: string[]
  inventory_tag_ids: string[]
  weight_descriptor: string | null
  weight_grams: number | null
  quantity: number
  unit_price: number
  is_medical: boolean
}

export interface DiscountFilter {
  strain_ids: string[]
  category_ids: string[]
  brand_ids: string[]
  vendor_ids: string[]
  weight_ids: string[]
  product_tag_ids: string[]
  inventory_tag_ids: string[]
  pricing_tier_ids: string[]
  product_ids: string[]
}

export interface DiscountConstraint {
  id: string
  min_quantity: number | null
  min_spend: number | null
  min_weight: number | null
  group_by_sku: boolean
  filters: DiscountFilter[]
}

export interface DiscountReward {
  id: string
  reward_type: 'percentage' | 'fixed_amount' | 'price_to_amount' | 'free_item' | 'bogo'
  value: number
  max_discount_amount: number | null
  apply_to: 'each_item' | 'cheapest' | 'most_expensive' | 'cart_total'
  filters: DiscountFilter[]
}

export interface DiscountWithRules {
  id: string
  name: string
  discount_type: 'automatic' | 'manual' | 'coupon'
  is_stackable: boolean
  priority: number
  location_ids: string[]
  customer_type: 'all' | 'recreational' | 'medical'
  customer_group_ids: string[]
  segment_ids: string[]
  first_time_only: boolean
  per_customer_limit: number | null
  max_uses: number | null
  current_uses: number
  requires_manager_approval: boolean
  start_date: string | null
  end_date: string | null
  is_recurring: boolean
  recurrence_days: number[]
  recurrence_start_time: string | null
  recurrence_end_time: string | null
  constraints: DiscountConstraint[]
  rewards: DiscountReward[]
}

export interface DiscountEvaluationContext {
  location_id: string
  customer_type: 'recreational' | 'medical'
  customer_group_ids: string[]
  segment_ids: string[]
  is_first_time: boolean
  customer_id: string | null
  customer_use_counts: Map<string, number>
  now: Date
}

export interface LineApplication {
  cart_line_id: string
  discount_amount: number
  reward_type: string
}

export interface AppliedDiscount {
  discount_id: string
  discount_name: string
  discount_type: 'automatic' | 'manual' | 'coupon'
  total_savings: number
  line_applications: LineApplication[]
}

export interface DiscountApplicationResult {
  applied_discounts: AppliedDiscount[]
  available_manual_discounts: Array<{ id: string; name: string; requires_manager_approval: boolean }>
  item_discounts: Map<string, number>
  total_discount: number
}
