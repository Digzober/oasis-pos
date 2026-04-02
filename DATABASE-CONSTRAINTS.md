# Database Constraints Reference

**MANDATORY**: Read this file before writing ANY code that inserts or updates database records. Every CHECK constraint and NOT NULL requirement listed here MUST be respected. Using values not in these lists will cause runtime 500 errors.

---

## CHECK Constraints (Valid Values for TEXT Fields)

### audit_log
- `event_type`: `'create'`, `'update'`, `'delete'`, `'receive'`, `'manual_receive'`, `'adjust'`, `'transfer'`, `'move'`, `'combine'`, `'sublot'`, `'destroy'`

### biotrack_destruction_queue
- `status`: `'eligible'`, `'ineligible'`, `'scheduled'`, `'completed'`, `'cancelled'`

### biotrack_sync_log
- `api_version`: `'v1'`, `'v3'`, `'trace2'`
- `direction`: `'outbound'`, `'inbound'`
- `status`: `'success'`, `'error'`, `'pending'`, `'retry'`
- `sync_type`: `'batch'`, `'realtime'`

### campaign_recipients
- `status`: `'pending'`, `'sent'`, `'delivered'`, `'opened'`, `'clicked'`, `'bounced'`, `'failed'`, `'unsubscribed'`

### campaigns
- `campaign_type`: `'automated'`, `'one_time_blast'`
- `channel`: `'email'`, `'sms'`
- `status`: `'draft'`, `'active'`, `'sent'`, `'paused'`, `'archived'`

### cash_drawer_drops
- `drop_type`: `'safe_drop'`, `'bank_deposit'`, `'petty_cash'`, `'paid_out'`

### cash_drawers
- `status`: `'open'`, `'closed'`, `'reconciled'`

### customers
- `customer_type`: `'recreational'`, `'medical'`, `'medical_out_of_state'`, `'medical_tax_exempt'`, `'non_cannabis'`, `'distributor'`, `'processor'`, `'retailer'`
- `id_type`: `'drivers_license'`, `'passport'`, `'state_id'`, `'military_id'`
- `status`: `'active'`, `'banned'`, `'inactive'`

### discount_constraint_filters
- `filter_type`: `'strain'`, `'category'`, `'brand'`, `'vendor'`, `'weight'`, `'product_tag'`, `'inventory_tag'`, `'pricing_tier'`, `'product'`

### discount_constraints
- `threshold_type`: `'total_items'`, `'total_spend'`, `'total_weight'`

### discount_reward_filters
- `filter_type`: `'strain'`, `'category'`, `'brand'`, `'vendor'`, `'weight'`, `'product_tag'`, `'inventory_tag'`, `'pricing_tier'`, `'product'`

### discount_rewards
- `discount_method`: `'percent_off'`, `'dollar_off'`, `'price_to_amount'`, `'bogo'`, `'free_item'`

### discounts
- `application_method`: `'automatic'`, `'manual'`
- `status`: `'active'`, `'expired'`, `'draft'`, `'disabled'`

### employees
- `role`: `'budtender'`, `'shift_lead'`, `'manager'`, `'admin'`, `'owner'`

### events
- `status`: `'draft'`, `'upcoming'`, `'active'`, `'completed'`, `'cancelled'`

### fees_donations
- `fee_type`: `'fee'`, `'donation'`

### guestlist_entries
- `source`: `'walk_in'`, `'online_pickup'`, `'online_delivery'`, `'curbside'`, `'drive_thru'`, `'phone'`, `'kiosk'`
- `customer_type`: `'recreational'`, `'medical'`

### inventory_audits
- `status`: `'draft'`, `'in_progress'`, `'review'`, `'completed'`, `'cancelled'`

### inventory_items
- `testing_status`: `'untested'`, `'pending'`, `'passed'`, `'failed'`
  - **NOTE**: `'exempt'` is NOT valid. Use `'untested'` for non-cannabis items.

### label_templates
- `label_type`: `'package'`, `'product'`, `'barcode'`, `'custom'`
- `orientation`: `'portrait'`, `'landscape'`

### loyalty_config
- `enrollment_type`: `'opt_in'`, `'auto_enroll'`
- `redemption_method`: `'discount'`, `'payment_pretax'`, `'payment_posttax'`

### manifests
- `direction`: `'outbound'`, `'inbound'`
- `status`: `'draft'`, `'open'`, `'in_transit'`, `'delivered'`, `'sold'`, `'cancelled'`
- `tab`: `'wholesale'`, `'retail'`
- `type`: `'transfer'`, `'order'`

### online_orders
- `order_type`: `'pickup'`, `'delivery'`, `'curbside'`, `'kiosk'`, `'drive_thru'`
- `status`: `'pending'`, `'confirmed'`, `'preparing'`, `'ready'`, `'out_for_delivery'`, `'completed'`, `'cancelled'`

### product_categories
- `available_for`: `'all'`, `'medical'`, `'recreational'`

### product_label_settings
- `customer_type`: `'medical'`, `'recreational'`

### products
- `default_unit`: `'each'`, `'gram'`, `'eighth'`, `'quarter'`, `'half'`, `'ounce'`
- `net_weight_unit`: `'g'`, `'mg'`, `'oz'`, `'ml'`
- `product_type`: `'quantity'`, `'weight'`

### printers
- `printer_type`: `'esc_pos'`, `'zpl'`, `'brother'`, `'pdf'`
- `connection_type`: `'printnode'`, `'usb'`, `'network'`, `'bluetooth'`

### printer_assignments
- `assignment_type`: `'labels'`, `'receipts'`

### print_service_config
- `service_type`: `'printnode'`, `'google_cloud_print'`, `'direct'`
- `strain_type`: `'indica'`, `'sativa'`, `'hybrid'`, `'cbd'`

### purchase_limits
- `customer_type`: `'recreational'`, `'medical'`, `'all'`
- `time_period`: `'daily'`, `'weekly'`, `'monthly'`
- `unit`: `'grams'`, `'ounces'`, `'mg_thc'`, `'items'`

### purchase_orders
- `status`: `'draft'`, `'submitted'`, `'partial'`, `'received'`, `'cancelled'`

### receipt_config
- `config_type`: `'receipt'`, `'pick_ticket'`

### reconciliation_reports
- `status`: `'running'`, `'completed'`, `'failed'`

### referral_tracking
- `status`: `'pending'`, `'completed'`

### report_schedules
- `frequency`: `'daily'`, `'weekly'`, `'monthly'`, `'yearly'`

### rooms
- `room_area_unit`: `'sqft'`, `'sqm'`

### strains
- `strain_type`: `'indica'`, `'sativa'`, `'hybrid'`, `'cbd'`

### tags
- `tag_type`: `'product'`, `'inventory'`

### transaction_reasons
- `reason_type`: `'return'`, `'cancellation'`, `'void'`, `'adjustment'`

### badges
- `assignment_method`: `'manual'`, `'automatic'`

### tax_rates
- `applies_to`: `'recreational'`, `'medical'`, `'both'`

### workflow_executions
- `status`: `'running'`, `'completed'`, `'failed'`, `'cancelled'`

### transaction_payments
- `payment_method`: `'cash'`, `'debit'`, `'credit'`, `'epay'`, `'check'`, `'loyalty'`, `'coupon'`

### transactions
- `status`: `'pending'`, `'completed'`, `'voided'`, `'returned'`
- `transaction_type`: `'sale'`, `'return'`, `'void'`, `'exchange'`

### workflows
- `status`: `'draft'`, `'active'`, `'paused'`, `'archived'`

---

## Required NOT NULL Fields (No Default)

These columns are NOT NULL and have NO default value. You MUST provide a value on INSERT.

### audit_log
- `organization_id` (uuid), `entity_type` (text), `event_type` (text)

### customers
- `organization_id` (uuid)

### employees
- `organization_id` (uuid), `first_name` (text), `last_name` (text), `pin_hash` (text), `role` (text)

### inventory_items
- `product_id` (uuid), `location_id` (uuid)

### manifests
- `organization_id` (uuid), `title` (text)

### online_orders
- `location_id` (uuid), `order_number` (bigint), `customer_name` (text), `customer_phone` (text)

### products
- `organization_id` (uuid), `category_id` (uuid), `name` (text), `slug` (text)

### transaction_lines
- `transaction_id` (uuid), `product_id` (uuid), `product_name` (text), `unit_price` (numeric), `line_total` (numeric)

### transaction_payments
- `transaction_id` (uuid), `payment_method` (text), `amount` (numeric)

### transactions
- `location_id` (uuid), `employee_id` (uuid), `transaction_number` (bigint), `transaction_type` (text)

---

## Rules for Code Generation

1. **Before inserting into any table**, check this file for CHECK constraints on that table. Only use listed values.
2. **Before inserting into any table**, check the NOT NULL section. Provide all required fields.
3. **When adding new CHECK constraint values**, create a database migration to ALTER the constraint FIRST, then use the new value in code.
4. **Zod schemas** for API validation must use `z.enum([...])` with EXACTLY the values from this file, not approximations.
5. **TypeScript types** for constrained fields must use union literal types matching this file exactly.
6. **If you need a value not in this list** (like 'exempt' for testing_status), you MUST add a migration to update the CHECK constraint before writing code that uses it.
