# Settings Placeholder Disposition

> Generated from every `PLACEHOLDER` row in `SETTINGS-WIRING-AUDIT.md` by `npx tsx scripts/generate-settings-disposition.ts`.

Coverage: **355/355** audited rows — **236 wired**, **119 removed**.

| Audit line | Surface | Control | Disposition | Evidence | Commit |
| ---: | --- | --- | --- | --- | --- |
| 84 | A | `rounding_method` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 85 | A | `require_customer_checkout` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 86 | A | `show_customer_dob_checkout` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 87 | A | `require_id_scan` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 88 | A | `show_product_notes` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 89 | A | `auto_close_drawer` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 90 | A | `allow_partial_payments` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 91 | A | `enable_tips` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 92 | A | `show_loyalty_in_pos` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 93 | A | `require_manager_discount_approval` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 94 | A | `allow_price_overrides` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 95 | A | `show_cost_in_pos` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 96 | A | `enable_product_bundles` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 97 | A | `quick_add_customer` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 98 | A | `show_allotment_warning` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 99 | A | `auto_print_receipt` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 100 | A | `auto_print_label` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 101 | A | `show_cost_on_reports` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 102 | A | `enable_audit_trail` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 103 | A | `allow_bulk_operations` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 104 | A | `enable_export` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 105 | A | `show_margin_on_reports` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 106 | A | `enable_scheduled_reports` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 107 | A | `auto_deduct_on_sale` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 108 | A | `enable_batch_tracking` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 109 | A | `enable_lot_tracking` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 110 | A | `show_testing_status` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 111 | A | `require_lab_before_sale` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 112 | A | `enable_quarantine_workflow` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 114 | A | `show_flower_equivalent` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 115 | A | `enable_inventory_alerts` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 116 | A | `sync_weedmaps` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 117 | A | `sync_leafly` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 118 | A | `sync_springbig` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 119 | A | `sync_headset` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 120 | A | `enable_mobile_pos` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 121 | A | `require_wifi` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 122 | A | `allow_offline_mode` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 123 | A | `auto_sync_reconnect` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 124 | A | `show_original_price_discounted` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 125 | A | `apply_loyalty_before_tax` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 126 | A | `apply_discounts_before_tax` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 127 | A | `enable_price_scheduling` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 128 | A | `password_min_length` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 129 | A | `password_expiration_days` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 137 | B | `require_customer` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 139 | B | `allow_zero_price` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 140 | B | `print_receipt_auto` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 141 | B | `low_stock_threshold` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 142 | B | `auto_deduct_on_sale` | removed | Removed by canonical-key migration and settings-hub consolidation | `5f8742b` |
| 143 | B | `enable_reservations` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 145 | B | `require_id_verification` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 147 | B | `enable_online_ordering` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 148 | B | `pickup_window_minutes` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 149 | B | `max_advance_order_days` | wired | `src/lib/settings/schema.ts`; Phase B runtime/tests | `5f8742b` |
| 195 | BioTrack | `use_other_plant_material` | removed | Non-consumed toggle removed from BioTrack UI/API schema | working tree (uncommitted) |
| 245 | Labels | `label_type` | removed | Label type control removed; product type is internal | working tree (uncommitted) |
| 256 | Printers | Printer identity: `name` | removed | Decorative routing/identity controls removed from printer settings UI | working tree (uncommitted) |
| 257 | Printers | `printer_id` | removed | Decorative routing/identity controls removed from printer settings UI | working tree (uncommitted) |
| 258 | Printers | `printer_type` | removed | Decorative routing/identity controls removed from printer settings UI | working tree (uncommitted) |
| 259 | Printers | `computer_name` | removed | Decorative routing/identity controls removed from printer settings UI | working tree (uncommitted) |
| 260 | Printers | `connection_type` | removed | Decorative routing/identity controls removed from printer settings UI | working tree (uncommitted) |
| 263 | Printers | `supports_labels` | removed | Decorative routing/identity controls removed from printer settings UI | working tree (uncommitted) |
| 264 | Printers | `supports_receipts` | removed | Decorative routing/identity controls removed from printer settings UI | working tree (uncommitted) |
| 265 | Printers | Active status | removed | Decorative routing/identity controls removed from printer settings UI | working tree (uncommitted) |
| 266 | Print service | `service_type` | removed | Decorative service/API-key controls removed from settings UI | working tree (uncommitted) |
| 267 | Print service | `apiKey` | removed | Decorative service/API-key controls removed from settings UI | working tree (uncommitted) |
| 276 | Receipts | `receipt.show_location_name` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 277 | Receipts | `receipt.show_location_address` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 278 | Receipts | `receipt.show_location_phone` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 279 | Receipts | `receipt.show_license_number` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 280 | Receipts | `receipt.show_employee_name` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 281 | Receipts | `receipt.show_customer_name` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 282 | Receipts | `receipt.show_sku` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 283 | Receipts | `receipt.show_thc_percentage` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 284 | Receipts | `receipt.show_tax_breakdown` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 285 | Receipts | `receipt.show_discount_details` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 286 | Receipts | `receipt.show_loyalty_points` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 287 | Receipts | `receipt.show_return_policy` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 288 | Receipts | `receipt.show_biotrack_id` | wired | `src/lib/receipts/config.ts`; `src/lib/receipts/render.ts` | `5f8742b` |
| 314 | Guestlist | Guestlist status `color` | wired | `src/lib/guestlist/workflowMappings.ts`; terminal queue status rendering | working tree (uncommitted) |
| 318 | Guestlist | `preorder_notify_status_id` | wired | `src/lib/guestlist/workflowMappings.ts`; terminal queue status rendering | working tree (uncommitted) |
| 319 | Guestlist | `online_pickup_status_id` | wired | `src/lib/guestlist/workflowMappings.ts`; terminal queue status rendering | working tree (uncommitted) |
| 320 | Guestlist | `online_delivery_status_id` | wired | `src/lib/guestlist/workflowMappings.ts`; terminal queue status rendering | working tree (uncommitted) |
| 321 | Guestlist | `in_store_order_status_id` | wired | `src/lib/guestlist/workflowMappings.ts`; terminal queue status rendering | working tree (uncommitted) |
| 322 | Guestlist | `curbside_status_id` | wired | `src/lib/guestlist/workflowMappings.ts`; terminal queue status rendering | working tree (uncommitted) |
| 323 | Guestlist | `drive_thru_status_id` | wired | `src/lib/guestlist/workflowMappings.ts`; terminal queue status rendering | working tree (uncommitted) |
| 324 | Guestlist | `skipped_delivery_status_id` | wired | `src/lib/guestlist/workflowMappings.ts`; terminal queue status rendering | working tree (uncommitted) |
| 325 | Guestlist | `ready_for_delivery_status_id` | wired | `src/lib/guestlist/workflowMappings.ts`; terminal queue status rendering | working tree (uncommitted) |
| 326 | Guestlist | `start_delivery_route_status_id` | wired | `src/lib/guestlist/workflowMappings.ts`; terminal queue status rendering | working tree (uncommitted) |
| 327 | Workflow | `enabled_order_types.walk_in` | removed | Workflow page/API and JSON keys removed | working tree (uncommitted) |
| 328 | Workflow | `enabled_order_types.curbside` | removed | Workflow page/API and JSON keys removed | working tree (uncommitted) |
| 329 | Workflow | `enabled_order_types.pickup` | removed | Workflow page/API and JSON keys removed | working tree (uncommitted) |
| 330 | Workflow | `enabled_order_types.delivery` | removed | Workflow page/API and JSON keys removed | working tree (uncommitted) |
| 331 | Workflow | `workflow_type` | removed | Workflow page/API and JSON keys removed | working tree (uncommitted) |
| 332 | Workflow | `default_order_source` | removed | Workflow page/API and JSON keys removed | working tree (uncommitted) |
| 333 | Workflow | Order-source identity/lifecycle | removed | Workflow page/API and JSON keys removed | working tree (uncommitted) |
| 341 | Cards | `customer_card_fields.online_order_placed.address` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 342 | Cards | `customer_card_fields.online_order_placed.customer_name` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 343 | Cards | `customer_card_fields.online_order_placed.date_received` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 344 | Cards | `customer_card_fields.online_order_placed.discount_group` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 345 | Cards | `customer_card_fields.online_order_placed.drivers_license_number` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 346 | Cards | `customer_card_fields.online_order_placed.loyal_vs_non_loyal` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 347 | Cards | `customer_card_fields.online_order_placed.medical_card_id` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 348 | Cards | `customer_card_fields.online_order_placed.nickname` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 349 | Cards | `customer_card_fields.online_order_placed.order_source` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 350 | Cards | `customer_card_fields.online_order_placed.payment_status` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 351 | Cards | `customer_card_fields.online_order_placed.register` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 352 | Cards | `customer_card_fields.online_order_placed.state` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 353 | Cards | `customer_card_fields.online_order_placed.total_value_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 354 | Cards | `customer_card_fields.online_order_placed.transaction_reference` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 355 | Cards | `customer_card_fields.online_order_placed.customer_dob` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 356 | Cards | `customer_card_fields.online_order_placed.customer_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 357 | Cards | `customer_card_fields.online_order_placed.delivery_vehicle` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 358 | Cards | `customer_card_fields.online_order_placed.drivers_license_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 359 | Cards | `customer_card_fields.online_order_placed.last_purchase_date` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 360 | Cards | `customer_card_fields.online_order_placed.med_card_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 361 | Cards | `customer_card_fields.online_order_placed.new_vs_existing` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 362 | Cards | `customer_card_fields.online_order_placed.num_items_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 363 | Cards | `customer_card_fields.online_order_placed.order_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 364 | Cards | `customer_card_fields.online_order_placed.pronouns` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 365 | Cards | `customer_card_fields.online_order_placed.room` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 366 | Cards | `customer_card_fields.online_order_placed.time_window` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 367 | Cards | `customer_card_fields.online_order_placed.transaction_notes` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 368 | Cards | `customer_card_fields.walk_in.address` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 369 | Cards | `customer_card_fields.walk_in.customer_name` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 370 | Cards | `customer_card_fields.walk_in.date_received` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 371 | Cards | `customer_card_fields.walk_in.discount_group` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 372 | Cards | `customer_card_fields.walk_in.drivers_license_number` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 373 | Cards | `customer_card_fields.walk_in.loyal_vs_non_loyal` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 374 | Cards | `customer_card_fields.walk_in.medical_card_id` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 375 | Cards | `customer_card_fields.walk_in.nickname` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 376 | Cards | `customer_card_fields.walk_in.order_source` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 377 | Cards | `customer_card_fields.walk_in.payment_status` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 378 | Cards | `customer_card_fields.walk_in.register` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 379 | Cards | `customer_card_fields.walk_in.state` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 380 | Cards | `customer_card_fields.walk_in.total_value_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 381 | Cards | `customer_card_fields.walk_in.transaction_reference` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 382 | Cards | `customer_card_fields.walk_in.customer_dob` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 383 | Cards | `customer_card_fields.walk_in.customer_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 384 | Cards | `customer_card_fields.walk_in.delivery_vehicle` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 385 | Cards | `customer_card_fields.walk_in.drivers_license_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 386 | Cards | `customer_card_fields.walk_in.last_purchase_date` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 387 | Cards | `customer_card_fields.walk_in.med_card_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 388 | Cards | `customer_card_fields.walk_in.new_vs_existing` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 389 | Cards | `customer_card_fields.walk_in.num_items_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 390 | Cards | `customer_card_fields.walk_in.order_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 391 | Cards | `customer_card_fields.walk_in.pronouns` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 392 | Cards | `customer_card_fields.walk_in.room` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 393 | Cards | `customer_card_fields.walk_in.time_window` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 394 | Cards | `customer_card_fields.walk_in.transaction_notes` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 395 | Cards | `customer_card_fields.checked_in.address` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 396 | Cards | `customer_card_fields.checked_in.customer_name` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 397 | Cards | `customer_card_fields.checked_in.date_received` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 398 | Cards | `customer_card_fields.checked_in.discount_group` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 399 | Cards | `customer_card_fields.checked_in.drivers_license_number` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 400 | Cards | `customer_card_fields.checked_in.loyal_vs_non_loyal` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 401 | Cards | `customer_card_fields.checked_in.medical_card_id` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 402 | Cards | `customer_card_fields.checked_in.nickname` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 403 | Cards | `customer_card_fields.checked_in.order_source` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 404 | Cards | `customer_card_fields.checked_in.payment_status` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 405 | Cards | `customer_card_fields.checked_in.register` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 406 | Cards | `customer_card_fields.checked_in.state` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 407 | Cards | `customer_card_fields.checked_in.total_value_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 408 | Cards | `customer_card_fields.checked_in.transaction_reference` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 409 | Cards | `customer_card_fields.checked_in.customer_dob` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 410 | Cards | `customer_card_fields.checked_in.customer_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 411 | Cards | `customer_card_fields.checked_in.delivery_vehicle` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 412 | Cards | `customer_card_fields.checked_in.drivers_license_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 413 | Cards | `customer_card_fields.checked_in.last_purchase_date` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 414 | Cards | `customer_card_fields.checked_in.med_card_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 415 | Cards | `customer_card_fields.checked_in.new_vs_existing` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 416 | Cards | `customer_card_fields.checked_in.num_items_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 417 | Cards | `customer_card_fields.checked_in.order_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 418 | Cards | `customer_card_fields.checked_in.pronouns` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 419 | Cards | `customer_card_fields.checked_in.room` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 420 | Cards | `customer_card_fields.checked_in.time_window` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 421 | Cards | `customer_card_fields.checked_in.transaction_notes` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 422 | Cards | `customer_card_fields.in_progress.address` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 423 | Cards | `customer_card_fields.in_progress.customer_name` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 424 | Cards | `customer_card_fields.in_progress.date_received` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 425 | Cards | `customer_card_fields.in_progress.discount_group` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 426 | Cards | `customer_card_fields.in_progress.drivers_license_number` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 427 | Cards | `customer_card_fields.in_progress.loyal_vs_non_loyal` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 428 | Cards | `customer_card_fields.in_progress.medical_card_id` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 429 | Cards | `customer_card_fields.in_progress.nickname` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 430 | Cards | `customer_card_fields.in_progress.order_source` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 431 | Cards | `customer_card_fields.in_progress.payment_status` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 432 | Cards | `customer_card_fields.in_progress.register` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 433 | Cards | `customer_card_fields.in_progress.state` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 434 | Cards | `customer_card_fields.in_progress.total_value_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 435 | Cards | `customer_card_fields.in_progress.transaction_reference` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 436 | Cards | `customer_card_fields.in_progress.customer_dob` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 437 | Cards | `customer_card_fields.in_progress.customer_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 438 | Cards | `customer_card_fields.in_progress.delivery_vehicle` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 439 | Cards | `customer_card_fields.in_progress.drivers_license_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 440 | Cards | `customer_card_fields.in_progress.last_purchase_date` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 441 | Cards | `customer_card_fields.in_progress.med_card_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 442 | Cards | `customer_card_fields.in_progress.new_vs_existing` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 443 | Cards | `customer_card_fields.in_progress.num_items_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 444 | Cards | `customer_card_fields.in_progress.order_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 445 | Cards | `customer_card_fields.in_progress.pronouns` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 446 | Cards | `customer_card_fields.in_progress.room` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 447 | Cards | `customer_card_fields.in_progress.time_window` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 448 | Cards | `customer_card_fields.in_progress.transaction_notes` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 449 | Cards | `customer_card_fields.ready.address` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 450 | Cards | `customer_card_fields.ready.customer_name` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 451 | Cards | `customer_card_fields.ready.date_received` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 452 | Cards | `customer_card_fields.ready.discount_group` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 453 | Cards | `customer_card_fields.ready.drivers_license_number` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 454 | Cards | `customer_card_fields.ready.loyal_vs_non_loyal` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 455 | Cards | `customer_card_fields.ready.medical_card_id` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 456 | Cards | `customer_card_fields.ready.nickname` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 457 | Cards | `customer_card_fields.ready.order_source` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 458 | Cards | `customer_card_fields.ready.payment_status` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 459 | Cards | `customer_card_fields.ready.register` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 460 | Cards | `customer_card_fields.ready.state` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 461 | Cards | `customer_card_fields.ready.total_value_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 462 | Cards | `customer_card_fields.ready.transaction_reference` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 463 | Cards | `customer_card_fields.ready.customer_dob` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 464 | Cards | `customer_card_fields.ready.customer_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 465 | Cards | `customer_card_fields.ready.delivery_vehicle` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 466 | Cards | `customer_card_fields.ready.drivers_license_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 467 | Cards | `customer_card_fields.ready.last_purchase_date` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 468 | Cards | `customer_card_fields.ready.med_card_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 469 | Cards | `customer_card_fields.ready.new_vs_existing` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 470 | Cards | `customer_card_fields.ready.num_items_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 471 | Cards | `customer_card_fields.ready.order_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 472 | Cards | `customer_card_fields.ready.pronouns` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 473 | Cards | `customer_card_fields.ready.room` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 474 | Cards | `customer_card_fields.ready.time_window` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 475 | Cards | `customer_card_fields.ready.transaction_notes` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 476 | Cards | `customer_card_fields.completed.address` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 477 | Cards | `customer_card_fields.completed.customer_name` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 478 | Cards | `customer_card_fields.completed.date_received` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 479 | Cards | `customer_card_fields.completed.discount_group` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 480 | Cards | `customer_card_fields.completed.drivers_license_number` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 481 | Cards | `customer_card_fields.completed.loyal_vs_non_loyal` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 482 | Cards | `customer_card_fields.completed.medical_card_id` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 483 | Cards | `customer_card_fields.completed.nickname` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 484 | Cards | `customer_card_fields.completed.order_source` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 485 | Cards | `customer_card_fields.completed.payment_status` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 486 | Cards | `customer_card_fields.completed.register` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 487 | Cards | `customer_card_fields.completed.state` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 488 | Cards | `customer_card_fields.completed.total_value_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 489 | Cards | `customer_card_fields.completed.transaction_reference` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 490 | Cards | `customer_card_fields.completed.customer_dob` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 491 | Cards | `customer_card_fields.completed.customer_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 492 | Cards | `customer_card_fields.completed.delivery_vehicle` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 493 | Cards | `customer_card_fields.completed.drivers_license_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 494 | Cards | `customer_card_fields.completed.last_purchase_date` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 495 | Cards | `customer_card_fields.completed.med_card_exp` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 496 | Cards | `customer_card_fields.completed.new_vs_existing` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 497 | Cards | `customer_card_fields.completed.num_items_in_cart` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 498 | Cards | `customer_card_fields.completed.order_type` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 499 | Cards | `customer_card_fields.completed.pronouns` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 500 | Cards | `customer_card_fields.completed.room` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 501 | Cards | `customer_card_fields.completed.time_window` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 502 | Cards | `customer_card_fields.completed.transaction_notes` | wired | `src/lib/customers/cardFields.ts`; `CustomerCardDetails.tsx` | working tree (uncommitted) |
| 508 | Adjustments | Adjustment-reason identity/lifecycle | removed | Register reason page/API removed | working tree (uncommitted) |
| 509 | Returns | Return-reason identity/lifecycle | removed | Register reason page/API removed | working tree (uncommitted) |
| 510 | Cancellations | Cancellation-reason identity/lifecycle | removed | Register reason page/API removed | working tree (uncommitted) |
| 511 | Voids | Void-reason identity/lifecycle | removed | Register reason page/API removed | working tree (uncommitted) |
| 512 | Register settings | `restrict_transaction_hours` | removed | Transaction-hours settings page and JSON keys removed | working tree (uncommitted) |
| 513 | Register settings | `transaction_hours_start` | removed | Transaction-hours settings page and JSON keys removed | working tree (uncommitted) |
| 514 | Register settings | `transaction_hours_end` | removed | Transaction-hours settings page and JSON keys removed | working tree (uncommitted) |
| 525 | Doctors | Doctor identity/contact/license | removed | Doctors configuration page/API removed | working tree (uncommitted) |
| 526 | Qualifying conditions | Condition identity/description | removed | Qualifying-conditions page/API removed | working tree (uncommitted) |
| 527 | Customer fields | `customer_field_visibility.pos.name` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 528 | Customer fields | `customer_field_visibility.pos.dob` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 529 | Customer fields | `customer_field_visibility.pos.referred_by` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 530 | Customer fields | `customer_field_visibility.pos.phone` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 531 | Customer fields | `customer_field_visibility.pos.mobile_phone` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 532 | Customer fields | `customer_field_visibility.pos.email` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 533 | Customer fields | `customer_field_visibility.pos.drivers_license` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 534 | Customer fields | `customer_field_visibility.pos.drivers_license_exp` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 535 | Customer fields | `customer_field_visibility.pos.street` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 536 | Customer fields | `customer_field_visibility.pos.city` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 537 | Customer fields | `customer_field_visibility.pos.zip` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 538 | Customer fields | `customer_field_visibility.pos.state` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 539 | Customer fields | `customer_field_visibility.pos.mmj_id` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 540 | Customer fields | `customer_field_visibility.pos.mmj_id_exp` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 541 | Customer fields | `customer_field_visibility.pos.prefix` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 542 | Customer fields | `customer_field_visibility.pos.middle_name` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 543 | Customer fields | `customer_field_visibility.pos.suffix` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 544 | Customer fields | `customer_field_visibility.pos.nickname` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 545 | Customer fields | `customer_field_visibility.pos.gender` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 546 | Customer fields | `customer_field_visibility.pos.last_name` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 547 | Customer fields | `customer_field_visibility.backend.name` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 548 | Customer fields | `customer_field_visibility.backend.id_expiration` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 549 | Customer fields | `customer_field_visibility.backend.address1` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 550 | Customer fields | `customer_field_visibility.backend.address2` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 551 | Customer fields | `customer_field_visibility.backend.city` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 552 | Customer fields | `customer_field_visibility.backend.state` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 553 | Customer fields | `customer_field_visibility.backend.zip` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 554 | Customer fields | `customer_field_visibility.backend.status` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 555 | Customer fields | `customer_field_visibility.backend.dob` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 556 | Customer fields | `customer_field_visibility.backend.drivers_license` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 557 | Customer fields | `customer_field_visibility.backend.drivers_license_exp` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 558 | Customer fields | `customer_field_visibility.backend.phone` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 559 | Customer fields | `customer_field_visibility.backend.mobile_phone` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 560 | Customer fields | `customer_field_visibility.backend.email` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 561 | Customer fields | `customer_field_visibility.backend.middle_name` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 562 | Customer fields | `customer_field_visibility.backend.suffix` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 563 | Customer fields | `customer_field_visibility.backend.gender` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 564 | Customer fields | `customer_field_visibility.backend.notes` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 565 | Customer fields | `customer_field_visibility.backend.caregiver_first` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 566 | Customer fields | `customer_field_visibility.backend.caregiver_last` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 567 | Customer fields | `customer_field_visibility.backend.caregiver_phone` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 568 | Customer fields | `customer_field_visibility.backend.caregiver_email` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 569 | Customer fields | `customer_field_visibility.backend.prefix` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 570 | Customer fields | `customer_field_visibility.backend.mmj_id` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 571 | Customer fields | `customer_field_visibility.backend.last_name` | wired | `fieldVisibility.ts`; POS/backoffice customer forms | working tree (uncommitted) |
| 572 | Customer fields | `customer_field_visibility.prescription.rx_number` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 573 | Customer fields | `customer_field_visibility.prescription.electronic` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 574 | Customer fields | `customer_field_visibility.prescription.product` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 575 | Customer fields | `customer_field_visibility.prescription.unit` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 576 | Customer fields | `customer_field_visibility.prescription.quantity` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 577 | Customer fields | `customer_field_visibility.prescription.notes` | removed | Removed from strict schema, writer, and customer configuration UI | working tree (uncommitted) |
| 587 | Badges | `description` | removed | Decorative badge controls removed from UI and API schemas | working tree (uncommitted) |
| 588 | Badges | `assignment_method` | removed | Decorative badge controls removed from UI and API schemas | working tree (uncommitted) |
| 589 | Badges | `segment_id` | removed | Decorative badge controls removed from UI and API schemas | working tree (uncommitted) |
| 590 | Badges | `show_in_register` | removed | Decorative badge controls removed from UI and API schemas | working tree (uncommitted) |
| 614 | Categories | `parent_id` | removed | Parent control removed from category UI and API schemas | working tree (uncommitted) |
| 679 | Inventory statuses | Inventory-status identity: name/description | wired | Active identity is loaded by inventory receive/item flows | working tree (uncommitted) |
| 680 | Inventory statuses | Inventory-status `color` | removed | Color control removed from UI and writer schema | working tree (uncommitted) |
| 681 | Inventory statuses | Inventory-status lifecycle | wired | Active identity is loaded by inventory receive/item flows | working tree (uncommitted) |
| 682 | Inventory adjustments | Adjustment-reason identity | wired | Active reasons are loaded by adjustment forms | working tree (uncommitted) |
| 683 | Inventory adjustments | Adjustment-reason lifecycle | wired | Active reasons are loaded by adjustment forms | working tree (uncommitted) |
| 685 | Dosages | `thc_mg` | removed | THC/CBD/serving controls removed; dosage name remains consumed | working tree (uncommitted) |
| 686 | Dosages | `cbd_mg` | removed | THC/CBD/serving controls removed; dosage name remains consumed | working tree (uncommitted) |
| 687 | Dosages | `serving_size` | removed | THC/CBD/serving controls removed; dosage name remains consumed | working tree (uncommitted) |
| 689 | Packing lists/kits | Kit identity | removed | Kit pages, APIs, and configuration component removed | working tree (uncommitted) |
| 690 | Packing lists/kits | Kit price | removed | Kit pages, APIs, and configuration component removed | working tree (uncommitted) |
| 691 | Packing lists/kits | Kit composition/quantity | removed | Kit pages, APIs, and configuration component removed | working tree (uncommitted) |
| 692 | Packing lists/kits | Kit lifecycle | removed | Kit pages, APIs, and configuration component removed | working tree (uncommitted) |
| 693 | Package formats | Package-format identity | removed | Package-format UI, APIs, service, schema, and registry removed | working tree (uncommitted) |
| 694 | Package formats | Package-format category | removed | Package-format UI, APIs, service, schema, and registry removed | working tree (uncommitted) |
| 695 | Package formats | Package-format template | removed | Package-format UI, APIs, service, schema, and registry removed | working tree (uncommitted) |
| 696 | Package formats | Package-format lifecycle | removed | Package-format UI, APIs, service, schema, and registry removed | working tree (uncommitted) |
| 705 | Loyalty | `initial_signup_reward` | removed | Only consumed accrual rate remains in loyalty settings | working tree (uncommitted) |
| 706 | Loyalty | `enrollment_type` | removed | Only consumed accrual rate remains in loyalty settings | working tree (uncommitted) |
| 707 | Loyalty | `online_description` | removed | Only consumed accrual rate remains in loyalty settings | working tree (uncommitted) |
| 708 | Loyalty | `redemption_method` | removed | Only consumed accrual rate remains in loyalty settings | working tree (uncommitted) |
| 709 | Loyalty | `point_expiration_days` | removed | Only consumed accrual rate remains in loyalty settings | working tree (uncommitted) |
| 710 | Loyalty | `tiers_enabled` | removed | Only consumed accrual rate remains in loyalty settings | working tree (uncommitted) |
| 718 | Marketing configure | Marketing-tag identity | removed | Marketing configure page/tag API and JSON key removed | working tree (uncommitted) |
| 719 | Marketing configure | Marketing-tag lifecycle | removed | Marketing configure page/tag API and JSON key removed | working tree (uncommitted) |
| 720 | Marketing configure | `default_store_url` | removed | Marketing configure page/tag API and JSON key removed | working tree (uncommitted) |
| 742 | Discount builder | Coupon `code` | removed | Coupon code option and persistence removed | working tree (uncommitted) |
| 770 | Events | Event identity | wired | `src/app/(storefront)/events/page.tsx` renders event data and image | working tree (uncommitted) |
| 771 | Events | Event start date | wired | `src/app/(storefront)/events/page.tsx` renders event data and image | working tree (uncommitted) |
| 772 | Events | Event end date | wired | `src/app/(storefront)/events/page.tsx` renders event data and image | working tree (uncommitted) |
| 773 | Events | Event image URL | wired | `src/app/(storefront)/events/page.tsx` renders event data and image | working tree (uncommitted) |
| 776 | Templates | Template lifecycle | wired | `templateService.ts` filters lifecycle for campaign consumers | working tree (uncommitted) |
