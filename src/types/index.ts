import type { Database } from './database'

// Table row types (what you get back from a SELECT)
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type LocationSettings = Database['public']['Tables']['location_settings']['Row']
export type Employee = Database['public']['Tables']['employees']['Row']
export type EmployeeLocation = Database['public']['Tables']['employee_locations']['Row']

// Permission system
export type PermissionDefinition = Database['public']['Tables']['permission_definitions']['Row']
export type PermissionGroup = Database['public']['Tables']['permission_groups']['Row']

// Shared lookups
export type Brand = Database['public']['Tables']['brands']['Row']
export type Vendor = Database['public']['Tables']['vendors']['Row']
export type Strain = Database['public']['Tables']['strains']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type TaxCategory = Database['public']['Tables']['tax_categories']['Row']
export type PricingTier = Database['public']['Tables']['pricing_tiers']['Row']
export type Room = Database['public']['Tables']['rooms']['Row']
export type Subroom = Database['public']['Tables']['subrooms']['Row']

// Products
export type ProductCategory = Database['public']['Tables']['product_categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type LocationProductPrice = Database['public']['Tables']['location_product_prices']['Row']
export type ProductImage = Database['public']['Tables']['product_images']['Row']

// Inventory
export type InventoryItem = Database['public']['Tables']['inventory_items']['Row']

// Customers
export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerGroup = Database['public']['Tables']['customer_groups']['Row']
export type Segment = Database['public']['Tables']['segments']['Row']

// Registers and cash
export type Register = Database['public']['Tables']['registers']['Row']
export type CashDrawer = Database['public']['Tables']['cash_drawers']['Row']
export type CashDrawerDrop = Database['public']['Tables']['cash_drawer_drops']['Row']

// Transactions
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionLine = Database['public']['Tables']['transaction_lines']['Row']
export type TransactionPayment = Database['public']['Tables']['transaction_payments']['Row']
export type TransactionTax = Database['public']['Tables']['transaction_taxes']['Row']
export type TransactionDiscount = Database['public']['Tables']['transaction_discounts']['Row']

// Discounts
export type Discount = Database['public']['Tables']['discounts']['Row']
export type DiscountConstraint = Database['public']['Tables']['discount_constraints']['Row']
export type DiscountConstraintFilter = Database['public']['Tables']['discount_constraint_filters']['Row']
export type DiscountReward = Database['public']['Tables']['discount_rewards']['Row']
export type DiscountRewardFilter = Database['public']['Tables']['discount_reward_filters']['Row']

// Loyalty
export type LoyaltyConfig = Database['public']['Tables']['loyalty_config']['Row']
export type LoyaltyTier = Database['public']['Tables']['loyalty_tiers']['Row']
export type LoyaltyBalance = Database['public']['Tables']['loyalty_balances']['Row']
export type LoyaltyTransaction = Database['public']['Tables']['loyalty_transactions']['Row']

// Online orders
export type OnlineOrder = Database['public']['Tables']['online_orders']['Row']
export type OnlineOrderLine = Database['public']['Tables']['online_order_lines']['Row']

// Delivery
export type DeliveryVehicle = Database['public']['Tables']['delivery_vehicles']['Row']
export type DeliveryDriver = Database['public']['Tables']['delivery_drivers']['Row']
export type DeliveryZone = Database['public']['Tables']['delivery_zones']['Row']
export type DeliveryConfig = Database['public']['Tables']['delivery_config']['Row']

// Marketing
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type CampaignTemplate = Database['public']['Tables']['campaign_templates']['Row']
export type Workflow = Database['public']['Tables']['workflows']['Row']
export type Event = Database['public']['Tables']['events']['Row']

// Config
export type TaxRate = Database['public']['Tables']['tax_rates']['Row']
export type PurchaseLimit = Database['public']['Tables']['purchase_limits']['Row']
export type FeeDonation = Database['public']['Tables']['fees_donations']['Row']
export type ReceiptConfig = Database['public']['Tables']['receipt_config']['Row']
export type LabelTemplate = Database['public']['Tables']['label_templates']['Row']
export type ReportSchedule = Database['public']['Tables']['report_schedules']['Row']

// Operations
export type TimeClockEntry = Database['public']['Tables']['time_clock_entries']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
export type BioTrackSyncLog = Database['public']['Tables']['biotrack_sync_log']['Row']

// Insert types (what you send to an INSERT)
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type LocationInsert = Database['public']['Tables']['locations']['Insert']
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductCategoryInsert = Database['public']['Tables']['product_categories']['Insert']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type InventoryItemInsert = Database['public']['Tables']['inventory_items']['Insert']

// Update types (what you send to an UPDATE)
export type ProductUpdate = Database['public']['Tables']['products']['Update']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']
export type EmployeeUpdate = Database['public']['Tables']['employees']['Update']
export type InventoryItemUpdate = Database['public']['Tables']['inventory_items']['Update']

// Re-export the full Database type for Supabase client typing
export type { Database }
