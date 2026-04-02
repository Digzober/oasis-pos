# Location Settings JSONB Key Registry

All keys stored in `location_settings.settings` JSONB. Each key listed with type, default, and description.

## Rounding
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `rounding_method` | string | `'none'` | Rounding method: none, round_up_025, round_up_050, round_up_100, round_down_025, round_down_050, round_down_100, round_nearest_005, round_nearest_010, round_nearest_025, round_nearest_050 |

## Point of Sale
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `require_customer_checkout` | boolean | `false` | Require customer for checkout |
| `show_customer_dob_checkout` | boolean | `false` | Show customer DOB on checkout screen |
| `require_id_scan` | boolean | `false` | Require ID scan for each visit |
| `show_product_notes` | boolean | `true` | Show product notes in POS |
| `auto_close_drawer` | boolean | `false` | Auto-close cash drawer after sale |
| `allow_partial_payments` | boolean | `true` | Allow partial/split payments |
| `enable_tips` | boolean | `false` | Enable tip collection |
| `show_loyalty_in_pos` | boolean | `true` | Show loyalty points in POS |
| `require_manager_discount_approval` | boolean | `false` | Require manager approval for discounts |
| `manager_discount_threshold` | number | `null` | % threshold requiring manager approval |
| `allow_price_overrides` | boolean | `false` | Allow price overrides at POS |
| `show_cost_in_pos` | boolean | `false` | Show product cost to budtenders |
| `enable_product_bundles` | boolean | `false` | Enable product bundling |
| `quick_add_customer` | boolean | `true` | Enable quick-add customer mode |
| `show_allotment_warning` | boolean | `true` | Show allotment warning before checkout |
| `auto_print_receipt` | boolean | `true` | Auto-print receipt after sale |
| `auto_print_label` | boolean | `false` | Auto-print label after sale |
| `show_weight_in_pos` | boolean | `true` | Show weight in POS item display |
| `enable_pre_orders` | boolean | `false` | Enable pre-order functionality |

## Admin
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `show_cost_on_reports` | boolean | `true` | Show cost data on reports |
| `enable_audit_trail` | boolean | `true` | Enable audit trail logging |
| `allow_bulk_operations` | boolean | `true` | Allow bulk operations |
| `enable_export` | boolean | `true` | Enable data export |
| `show_margin_on_reports` | boolean | `false` | Show margin calculations on reports |
| `enable_scheduled_reports` | boolean | `false` | Enable scheduled report delivery |

## Inventory
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `auto_deduct_on_sale` | boolean | `true` | Auto-deduct inventory on sale |
| `enable_batch_tracking` | boolean | `true` | Enable batch tracking |
| `enable_lot_tracking` | boolean | `true` | Enable lot tracking |
| `show_testing_status` | boolean | `true` | Show testing status on inventory |
| `require_lab_before_sale` | boolean | `false` | Require lab results before sale |
| `enable_quarantine_workflow` | boolean | `false` | Enable quarantine workflow |
| `auto_sync_biotrack` | boolean | `true` | Auto-sync inventory with BioTrack |
| `show_flower_equivalent` | boolean | `true` | Show flower equivalent on products |
| `enable_inventory_alerts` | boolean | `true` | Enable low stock alerts |
| `low_stock_threshold` | number | `5` | Default low stock threshold |

## Integrations
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `sync_weedmaps` | boolean | `false` | Sync menu with Weedmaps |
| `sync_leafly` | boolean | `false` | Sync menu with Leafly |
| `sync_springbig` | boolean | `false` | Sync with SpringBig loyalty |
| `sync_headset` | boolean | `false` | Sync with Headset analytics |

## Mobile Checkout
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enable_mobile_pos` | boolean | `false` | Enable mobile POS |
| `require_wifi` | boolean | `true` | Require WiFi for mobile POS |
| `allow_offline_mode` | boolean | `false` | Allow offline mode |
| `auto_sync_reconnect` | boolean | `true` | Auto-sync on reconnect |

## Item Pricing
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `show_original_price_discounted` | boolean | `true` | Show original price on discounted items |
| `apply_loyalty_before_tax` | boolean | `false` | Apply loyalty points before tax |
| `apply_discounts_before_tax` | boolean | `true` | Apply discounts before tax |
| `enable_price_scheduling` | boolean | `false` | Enable price scheduling |

## Security
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `password_min_length` | number | `8` | Minimum password length |
| `password_expiration_days` | number | `0` | Days until password expires (0 = never) |

## Online Ordering
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enable_online_ordering` | boolean | `true` | Enable online ordering |
| `enable_reservations` | boolean | `false` | Enable reservations |
| `pickup_window_minutes` | number | `30` | Pickup window in minutes |
| `max_advance_order_days` | number | `1` | Max days in advance for orders |

## Register Configure (managed by /registers/configure/* pages)
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled_order_types` | string[] | `['walk_in']` | Enabled order types |
| `workflow_type` | string | `'traditional'` | Workflow: traditional or fulfillment |
| `default_order_source` | string | `''` | Default order source ID |
| `customer_card_fields` | object | `{}` | Per-status card field visibility |
| `restrict_transaction_hours` | boolean | `false` | Restrict transaction hours |
| `transaction_hours_start` | string | `'08:00'` | Transaction start time |
| `transaction_hours_end` | string | `'22:00'` | Transaction end time |

## Guestlist Status Mappings
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `guestlist_default_status_id` | uuid | `null` | Default guestlist status |
| `guestlist_preorder_notify_status_id` | uuid | `null` | Pre-order notify status |
| `guestlist_online_pickup_status_id` | uuid | `null` | Online pickup status |
| `guestlist_online_delivery_status_id` | uuid | `null` | Online delivery status |
| `guestlist_instore_order_status_id` | uuid | `null` | In-store order status |
| `guestlist_curbside_status_id` | uuid | `null` | Curbside status |
| `guestlist_drive_thru_status_id` | uuid | `null` | Drive-thru status |
| `guestlist_skipped_delivery_status_id` | uuid | `null` | Skipped delivery status |
| `guestlist_ready_delivery_status_id` | uuid | `null` | Ready for delivery status |
| `guestlist_start_route_status_id` | uuid | `null` | Start delivery route status |

## Customer Configure (managed by /customers/configure/* pages)
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `customer_field_visibility` | object | `{}` | Field visibility: { pos, backend, prescription } |
| `badge_priority` | uuid[] | `[]` | Ordered segment IDs for badge display |

## Marketing
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `default_store_url` | string | `''` | Default store URL for marketing links |

## Customer Facing Display
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `cfd_enabled` | boolean | `false` | Enable customer facing display |
| `cfd_wallpaper_url` | string | `null` | Custom wallpaper URL for CFD |

## Receipt Config
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `receipt.show_sku` | boolean | `true` | Show SKU on receipt |
| `receipt.show_biotrack_id` | boolean | `true` | Show BioTrack ID |
| `receipt.show_customer_name` | boolean | `true` | Show customer name |
| `receipt.show_employee_name` | boolean | `true` | Show employee name |
| `receipt.show_location_name` | boolean | `true` | Show location name |
| `receipt.show_return_policy` | boolean | `true` | Show return policy |
| `receipt.show_tax_breakdown` | boolean | `true` | Show tax breakdown |
| `receipt.show_license_number` | boolean | `true` | Show license number |
| `receipt.show_location_phone` | boolean | `true` | Show location phone |
| `receipt.show_loyalty_points` | boolean | `true` | Show loyalty points |
| `receipt.show_thc_percentage` | boolean | `true` | Show THC % |
| `receipt.show_discount_details` | boolean | `true` | Show discount details |
| `receipt.show_location_address` | boolean | `true` | Show location address |
