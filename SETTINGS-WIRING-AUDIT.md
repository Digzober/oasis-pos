# Settings Wiring Audit

**Audited commit:** `9c74c5845a7b4fe9520b0259a074850f1aa31b51` (`9c74c58`)

**Branch observed:** `route/settings-wiring-audit`

**Audit type:** Static writer-to-behavior wiring audit
**Method:** Every sidebar-reachable configuration writer was inventoried, its persistence and scope were traced, and `git grep -n` searches followed loaders, client/session state, APIs, cron/sync jobs, printing paths, caches, and behavioral branches. The registry is treated as a candidate list, not runtime authority.

This is not a live database or browser smoke test. A WIRED verdict means the repository contains a complete static chain from writer through storage/loading to a behavioral branch reachable from a production entry point. It does not prove that deployed data, credentials, RLS policies, external services, or hardware are healthy.

## Executive summary

No: most settings are not wired. Of 549 audited control-by-surface rows, only 69 are WIRED. There are 355 PLACEHOLDER rows, 49 control-specific BROKEN-WRITE rows, 39 PARTIAL rows, 8 DRIFT rows, 15 registry-only UNEXPOSED paths, 9 aliases, 4 read-only surfaces, and 1 static reference page.

| Verdict | Rows |
|---|---:|
| WIRED | 69 |
| BROKEN-WRITE | 49 |
| DRIFT | 8 |
| PARTIAL | 39 |
| PLACEHOLDER | 355 |
| UNEXPOSED | 15 |
| REDIRECT/ALIAS | 9 |
| READ-ONLY | 4 |
| STATIC/REFERENCE | 1 |
| **Total** | **549** |

### Counts by surface

| Surface | Rows | Verdict counts |
|---|---:|---|
| Surface A `/settings/location-settings` | 46 | PLACEHOLDER 45; DRIFT 1 |
| Surface B `/settings/locations/[id]/settings` | 13 | PLACEHOLDER 10; DRIFT 3 |
| `/settings/locations` | 1 | READ-ONLY 1 |
| Registry only | 15 | UNEXPOSED 15 |
| Appearance | 1 | WIRED 1 |
| BioTrack | 17 | DRIFT 1; PARTIAL 15; PLACEHOLDER 1 |
| Delivery organization config | 2 | BROKEN-WRITE 2 |
| Delivery zones | 3 | BROKEN-WRITE 3 |
| Delivery vehicles / drivers | 2 | READ-ONLY 2 |
| Dutchie | 9 | WIRED 9 |
| Fees | 4 | BROKEN-WRITE 4 |
| Labels | 4 | WIRED 3; PLACEHOLDER 1 |
| Limits | 1 | STATIC/REFERENCE 1 |
| Printers | 10 | BROKEN-WRITE 2; PLACEHOLDER 8 |
| Print service | 3 | BROKEN-WRITE 1; PLACEHOLDER 2 |
| Receipts | 13 | PLACEHOLDER 13 |
| Registers | 3 | BROKEN-WRITE 3 |
| Rooms | 1 | BROKEN-WRITE 1 |
| Taxes | 5 | BROKEN-WRITE 5 |
| Register configure, including index | 191 | WIRED 3; DRIFT 1; PLACEHOLDER 186; REDIRECT/ALIAS 1 |
| Customer configure, including index | 64 | WIRED 2; PARTIAL 2; PLACEHOLDER 57; BROKEN-WRITE 2; REDIRECT/ALIAS 1 |
| Products configure and aliases | 80 | WIRED 45; DRIFT 2; PARTIAL 5; PLACEHOLDER 17; BROKEN-WRITE 4; REDIRECT/ALIAS 7 |
| Loyalty, referrals, and marketing configure surfaces | 61 | WIRED 6; PARTIAL 17; PLACEHOLDER 15; BROKEN-WRITE 22; READ-ONLY 1 |

Row arithmetic is deliberate: A has 46 controls; B has 13 controls; their 59 rows contain 58 unique keys because `auto_deduct_on_sale` appears on both surfaces. The registry has 89 paths. The union of registry, A, and B is 96 unique paths. Of 38 registry paths absent from A/B, 23 have writers elsewhere and 15 are truly registry-only. Duplicate controls remain separate rows because row identity is control × writer surface.

### Top 10 impact findings

Ranked first by the required tier (compliance/legal, money, workflow, cosmetic), then by blast radius (checkout before backoffice):

1. **Tier 1 — BioTrack compliance:** the two JSON auto-sync controls drift from `biotrack_config.is_enabled`, while the actual sale path always queues an environment-backed sync and does not honor any of the three flags (`transactionService.ts:278-281`, `saleSync.ts:59-66`).
2. **Tier 1 — Purchase limits:** B's `enforce_purchase_limits` is inert; checkout always uses `purchase_limits` plus fallback rules (`purchaseLimitLoader.ts:13-64`, `transactionService.ts:156-168`). The visible Limits page is only hardcoded reference text.
3. **Tier 1 — ID controls:** `require_id_scan` and `require_id_verification` both persist but have no checkout consumer.
4. **Tier 1 — lab/allotment controls:** `require_lab_before_sale`, `show_allotment_warning`, and BioTrack `use_allotment_check` do not reach a sale-blocking branch.
5. **Tier 2 — tax configuration:** every create field on `/settings/taxes` omits the required location; existing edits can also remain stale for five minutes because no mutation clears `taxRateLoader`.
6. **Tier 2 — discount and tax order:** `rounding_method`, `apply_loyalty_before_tax`, and `apply_discounts_before_tax` are placeholders; checkout order is hardcoded.
7. **Tier 2 — discount builder:** 16 constraint/reward controls are BROKEN-WRITE; the loader also hardcodes recurrence off and drops some filters.
8. **Tier 2 — loyalty:** the only partially consumed accrual rate is loaded without organization filtering; tier writes target the wrong foreign key.
9. **Tier 3 — online ordering:** enable/reservation/window controls are placeholders; orders and inventory reservation proceed without those gates.
10. **Tier 3 — printing:** three auto-receipt variants and the printer routing/capability configuration have no production print-job consumer.

## Verdict manifest

The fixed columns below carry write reliability and default drift separately from the primary verdict. `NEG-A/B`, `NEG-R`, and other evidence codes refer to exact commands in the Evidence appendix.

### Surface A — `/settings/location-settings` (46 rows)

All rows write `location_settings.settings` for `session.locationId`. The UI loads one snapshot (`page.tsx:157-165`) and PATCHes the whole snapshot (`page.tsx:175-191`). The API checks errors, but its nontransactional read/merge/upsert (`api/settings/location-settings/route.ts:46-63`) permits stale cross-surface overwrite. Therefore every row says “Risk” in Writer OK without changing the primary verdict.

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| `rounding_method` | A | `location_settings.settings`; location | Risk: whole-blob overwrite | None (`NEG-A/B`) | PLACEHOLDER | No: `none` | Checkout uses fixed cent rounding. |
| `require_customer_checkout` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No: false | Transaction input accepts `customer_id: null` (`api/transactions/route.ts:11`). |
| `show_customer_dob_checkout` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | No checkout display branch. |
| `require_id_scan` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | Duplicate concept with B, also unread. |
| `show_product_notes` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** registry true, UI false | No POS display branch. |
| `auto_close_drawer` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | No drawer behavior branch. |
| `allow_partial_payments` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | Sale input has one payment method. |
| `enable_tips` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | No tip branch. |
| `show_loyalty_in_pos` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | No POS visibility branch. |
| `require_manager_discount_approval` | A | Same; location | Risk | None for this key (`NEG-A/B`) | PLACEHOLDER | No | Per-discount flag exists, but no terminal approval gate consumes it. |
| `allow_price_overrides` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | Location product prices are not an override permission gate. |
| `show_cost_in_pos` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | No POS display branch. |
| `enable_product_bundles` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | No bundle gate. |
| `quick_add_customer` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | No terminal branch. |
| `show_allotment_warning` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | Separate BioTrack setting is also incomplete. |
| `auto_print_receipt` | A | Same; location | Risk | None (`NEG-A/B-exact`) | PLACEHOLDER | **Yes:** true → false | Register and B variants are also unread. |
| `auto_print_label` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | Generated register variant has no consumer. |
| `show_cost_on_reports` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | Reports calculate/display cost unconditionally. |
| `enable_audit_trail` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | Audit writes are not gated. |
| `allow_bulk_operations` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | No permission branch. |
| `enable_export` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | No export gate. |
| `show_margin_on_reports` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | Margin is calculated independently. |
| `enable_scheduled_reports` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | No scheduler consumer. |
| `auto_deduct_on_sale` | A | Same; location | Risk | Unconditional SQL behavior `20260330170000_create_sale_transaction_function.sql:92-104`; key unread (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | Deduction cannot be disabled. |
| `enable_batch_tracking` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | No behavior branch. |
| `enable_lot_tracking` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | No behavior branch. |
| `show_testing_status` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | No display branch. |
| `require_lab_before_sale` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | Checkout inventory query does not gate on lab status. |
| `enable_quarantine_workflow` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | Quarantine actions are not gated. |
| `auto_sync_biotrack` | A | Same; location | Risk | Alternate table flag: `configLoader.ts:77-80`; test branch `test-connection/route.ts:33-37` | DRIFT | **Yes:** true → false | JSON key unread; real sale sync ignores both flags. |
| `show_flower_equivalent` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | No display branch. |
| `enable_inventory_alerts` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | Low-stock report is unconditional. |
| `sync_weedmaps` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | No integration consumer. |
| `sync_leafly` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | No integration consumer. |
| `sync_springbig` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | No integration consumer. |
| `sync_headset` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | No integration consumer. |
| `enable_mobile_pos` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | Terminal entry is not gated. |
| `require_wifi` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | No Wi-Fi check. |
| `allow_offline_mode` | A | Same; location | Risk | Unconditional startup `TerminalLayout.tsx:18-29`; cache `public/sw.js:19-60`; key unread (`NEG-A/B`) | PLACEHOLDER | No | Offline behavior always starts. |
| `auto_sync_reconnect` | A | Same; location | Risk | Unconditional worker `syncWorker.ts:31-38`; key unread (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | Worker always polls while online. |
| `show_original_price_discounted` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | No display branch. |
| `apply_loyalty_before_tax` | A | Same; location | Risk | Fixed post-tax accrual `transactionService.ts:229-241`; key unread (`NEG-A/B`) | PLACEHOLDER | No | Order cannot change. |
| `apply_discounts_before_tax` | A | Same; location | Risk | Fixed order `useCart.ts:161-180`, `transactionService.ts:124-147`; key unread (`NEG-A/B`) | PLACEHOLDER | **Yes:** true → false | Discounts always precede tax. |
| `enable_price_scheduling` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | No | No schedule store/loader. |
| `password_min_length` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** registry 8, state blank | Placeholder text does not initialize state. |
| `password_expiration_days` | A | Same; location | Risk | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** registry 0, state blank, placeholder 90 | Three-way default drift. |

### Surface B — `/settings/locations/[id]/settings` (13 rows)

All rows write `location_settings.settings` for the URL location after organization ownership validation. One shared debounce timer (`page.tsx:33,39-45`) means a second control edit within 500 ms cancels the first pending PUT. The UI ignores the PUT result and `updateLocationSettings` discards Supabase read/update/insert errors (`settingsService.ts:10-22`). These systemic defects are reflected in Writer OK, not promoted over DRIFT or PLACEHOLDER.

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| `require_customer` | B | `location_settings.settings`; location | **No:** timer + errors swallowed | None (`NEG-A/B`) | PLACEHOLDER | N/A: not in registry; UI false | Transaction accepts null customer. |
| `auto_apply_discounts` | B | Same; location | **No** | Alternate `discounts`: `discountLoader.ts:20-55`; branch `discountEvaluator.ts:27-42`; transaction API `route.ts:36` | DRIFT | N/A: alternate store | Runtime authority is org discount rows with optional location IDs. |
| `allow_zero_price` | B | Same; location | **No** | None (`NEG-A/B`) | PLACEHOLDER | N/A: not in registry; UI false | No price validation gate reads it. |
| `print_receipt_auto` | B | Same; location | **No** | None (`NEG-A/B`) | PLACEHOLDER | N/A: not in registry; UI false | Other auto-print variants are also unread. |
| `low_stock_threshold` | B | Same; location | **No** | Hardcoded 5 `advancedReportingService.ts:118`; key unread (`NEG-A/B`) | PLACEHOLDER | **Yes:** registry 5, UI blank, consumer hardcoded | Stored value cannot change threshold. |
| `auto_deduct_on_sale` | B | Same; location | **No** | Unconditional SQL `20260330170000_create_sale_transaction_function.sql:92-104`; key unread (`NEG-A/B`) | PLACEHOLDER | **Yes:** registry true, UI false | Duplicate A writer. |
| `enable_reservations` | B | Same; location | **No** | Unconditional `onlineOrderService.ts:63-89`; API `api/orders/route.ts:26`; key unread (`NEG-A/B`) | PLACEHOLDER | No: false | Turning it off does nothing. |
| `enforce_purchase_limits` | B | Same; location | **No** | Alternate `purchase_limits`: `purchaseLimitLoader.ts:13-64`; reject `transactionService.ts:156-168` | DRIFT | N/A: alternate store; UI false | Checkout authority is table/fallback, not JSON. |
| `require_id_verification` | B | Same; location | **No** | None (`NEG-A/B`) | PLACEHOLDER | N/A: not in registry; UI false | Duplicate A concept. |
| `biotrack_auto_sync` | B | Same; location | **No** | Alternate `biotrack_config.is_enabled` `configLoader.ts:77-80` | DRIFT | N/A: alternate store; UI false | Sale sync always triggers and uses environment client. |
| `enable_online_ordering` | B | Same; location | **No** | None; `locations.allows_online_orders` is types-only; JSON key unread (`NEG-A/B`) | PLACEHOLDER | **Yes:** registry true, UI false | Orders API remains reachable. |
| `pickup_window_minutes` | B | Same; location | **No** | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** registry 30, UI blank | Service only checks future time. |
| `max_advance_order_days` | B | Same; location | **No** | None (`NEG-A/B`) | PLACEHOLDER | **Yes:** registry 1, UI blank | No maximum-date branch. |

### Locations list and registry-only candidate paths (16 rows)

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Locations list | `/settings/locations` | `locations`; organization-owned locations | No writer on page | N/A | READ-ONLY | N/A | Fetches/renders and links only (`page.tsx:15-25`). No other `[id]` tab exists. |
| `manager_discount_threshold` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | Exact source count 0. |
| `show_weight_in_pos` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | Exact source count 0. |
| `enable_pre_orders` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | Exact source count 0. |
| `guestlist_default_status_id` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | UI writes `default_status_id`. |
| `guestlist_preorder_notify_status_id` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | UI writes unprefixed alias. |
| `guestlist_online_pickup_status_id` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | UI writes unprefixed alias. |
| `guestlist_online_delivery_status_id` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | UI writes unprefixed alias. |
| `guestlist_instore_order_status_id` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | UI writes `in_store_order_status_id`. |
| `guestlist_curbside_status_id` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | UI writes unprefixed alias. |
| `guestlist_drive_thru_status_id` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | UI writes unprefixed alias. |
| `guestlist_skipped_delivery_status_id` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | UI writes unprefixed alias. |
| `guestlist_ready_delivery_status_id` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | UI writes `ready_for_delivery_status_id`. |
| `guestlist_start_route_status_id` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | UI writes `start_delivery_route_status_id`. |
| `cfd_enabled` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | Exact source count 0. |
| `cfd_wallpaper_url` | Registry only | Candidate JSON; location | No writer | None (`NEG-R`) | UNEXPOSED | N/A | Exact source count 0. |

### Other `/settings/*` surfaces (78 rows, excluding aliases listed under Products)

#### Appearance

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| `theme` | `/settings/appearance` | localStorage + cookie; device/browser | Yes: `ThemePicker.tsx:21`, `ThemeProvider.tsx:44-53` | Root dataset branch `ThemeProvider.tsx:46`; pre-paint bootstrap `bootstrap.tsx:9-12`; root entry `app/layout.tsx:36-39`; CSS `globals.css:4,44,84` | WIRED | No | Page says system-wide, but actual scope is one browser/device. |

#### BioTrack (17 rows)

The UI checks the save response (`settings/biotrack/page.tsx:128-143`); the API validates, upserts for the session location, checks errors, and clears the five-minute config cache (`api/settings/biotrack-config/route.ts:121-144`). It does not clear the separate ten-minute `locationClients` cache (`client.ts:199-224`). Columns named `_encrypted` receive and return raw submitted strings.

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| `is_enabled` | BioTrack | `biotrack_config`; location | Yes | Branch `configLoader.ts:77-80`, but only behind unused `getBioTrackClientForLocation` `client.ts:208-224` | PARTIAL | **Yes:** UI false, API default true | Manifest and sale flows bypass the flag. |
| `state_code` | BioTrack | Same; location | Yes | Loaded `configLoader.ts:100`; unused per-location client | PARTIAL | No | Dead-ended after load. |
| `xml_api_url` | BioTrack | Same; location | Yes | Manifest API `api/inventory/manifests/route.ts:16-32`; downstream reload `inventorySync.ts:19-42` | PARTIAL | No | Entry is location-scoped, but reload uses external location ID only and drops organization scope. |
| `rest_api_url` | BioTrack | Same; location | Yes | Actual sale/void/refund uses `BIOTRACK_V3_URL` `client.ts:186-194` | DRIFT | No | Table value reaches only unused per-location client. |
| `username` | BioTrack | `username_encrypted`; location | Yes | Auth branch after reload `inventorySync.ts:19-39`; manifest API `route.ts:32` | PARTIAL | No | Downstream credential query drops organization scope; sale sync separately uses environment credential. |
| `password` | BioTrack | `password_encrypted`; location | Yes | Auth branch after reload `inventorySync.ts:19-39`; manifest API `route.ts:32` | PARTIAL | No | Downstream query drops organization scope; stored/returned without encryption. |
| `ubi` | BioTrack | `biotrack_config.ubi`; location | Yes | Login payload after reload `inventorySync.ts:19-40`; manifest API `route.ts:32` | PARTIAL | No | Downstream query drops organization scope; sale sync uses environment license. |
| `biotrack_location_id` | BioTrack | Same; location | Yes | Selection `api/inventory/manifests/route.ts:16-32`; reload `inventorySync.ts:19-22` | PARTIAL | No | Reload keys only by external ID; passed organization ID is unused. |
| `use_training_mode` | BioTrack | Same; location | Yes | Loaded `configLoader.ts:103`; production login hardcodes `training: '0'` `inventorySync.ts:41` | PARTIAL | No | Consumer path is dead and contradicted by hardcode. |
| `use_other_plant_material` | BioTrack | Same; location | Yes | None (`NEG-BIOTRACK`) | PLACEHOLDER | No | Only non-settings hit is an interface declaration. |
| `use_allotment_check` | BioTrack | Same; location | Yes | Loaded `configLoader.ts:104`; no caller/branch | PARTIAL | **Yes:** UI false, API true | Compliance check dead-ends. |
| `report_discounted_prices` | BioTrack | Same; location | Yes | Loaded `configLoader.ts:105`; actual payload fixed `saleSync.ts:47-53` | PARTIAL | No | No toggle branch. |
| `enable_deliveries` | BioTrack | Same; location | Yes | Loaded `configLoader.ts:106`; no branch | PARTIAL | No | Dead-ended. |
| `use_lab_data` | BioTrack | Same; location | Yes | Loaded `configLoader.ts:107`; no branch | PARTIAL | **Yes:** UI false, API true | Dead-ended. |
| `default_labs_in_receive` | BioTrack | Same; location | Yes | Loaded `configLoader.ts:108`; no branch | PARTIAL | **Yes:** UI false, API true | Dead-ended. |
| `display_approval_date` | BioTrack | Same; location | Yes | Loaded `configLoader.ts:109`; no display branch | PARTIAL | No | Dead-ended. |
| `schedule_returns_for_destruction` | BioTrack | Same; location | Yes | Loaded `configLoader.ts:110`; no return branch | PARTIAL | No | Dead-ended. |

#### Delivery (7 rows)

The location selector is misleading for organization config: GET sends `location_id` (`settings/delivery/page.tsx:21-28`), but the API ignores it and reads/writes `session.organizationId` (`api/delivery/config/route.ts:7-17`). Zone UI/service assume location scope while generated schema requires `organization_id`; create supplies neither.

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| `max_delivery_value` | Delivery config | Intended `delivery_config`; organization | **No:** sends nonexistent `max_delivery_value` + `is_active`; DB/UI errors ignored | None (`NEG-DELIVERY`) | BROKEN-WRITE | N/A | Schema stores `max_total_value` and has no `is_active` (`database.ts:1348-1375`). |
| `max_delivery_weight` | Delivery config | Intended `delivery_config`; organization | **No:** sends nonexistent `max_delivery_weight` + `is_active` | None (`NEG-DELIVERY`) | BROKEN-WRITE | N/A | Schema stores `max_total_weight_grams`; GET also filters nonexistent `is_active`. |
| Zone identity: `name` | Delivery zones | `delivery_zones`; schema organization / service location | **No:** required ownership omitted | Address API `api/delivery/check-address/route.ts:5-9`; name branch `deliveryService.ts:55-99` | BROKEN-WRITE | N/A | API/service pass raw body; schema/service scopes disagree. |
| `delivery_fee` | Delivery zones | Same | **No** | Sort/return branches `deliveryService.ts:48-62,76-96` | BROKEN-WRITE | N/A | Consumer exists, writer fails first. |
| `min_order` | Delivery zones | Same | **No** | Return branches `deliveryService.ts:62,83,97` | BROKEN-WRITE | N/A | Consumer exists, writer fails first. |
| Vehicles sub-surface | Delivery vehicles | `delivery_vehicles`; location | No writer on page | N/A | READ-ONLY | N/A | Fetch/render only `settings/delivery/page.tsx:24,92-98`. |
| Drivers sub-surface | Delivery drivers | `delivery_drivers`; organization | No writer on page | N/A | READ-ONLY | N/A | Fetch/render only `settings/delivery/page.tsx:25,99-103`. |

`estimated_delivery_minutes` is submitted with a fixed default but has no input, so it is not an independently mutable row.

#### Dutchie (9 rows)

The UI checks PATCH responses (`settings/dutchie/page.tsx:208-240`). The API writes location config and clears its cache (`api/settings/dutchie-config/route.ts:146-173,220`). Loyalty additionally writes organization state nontransactionally (`route.ts:175-206`).

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| `apiKey` | Dutchie | `dutchie_config.api_key_encrypted`; location | Yes | Client construction `syncEngine.ts:123-129`; manual API `api/dutchie/sync/route.ts:27-46` | WIRED | No | Manual and cron chain; stored directly despite name. |
| `syncEmployees` | Dutchie | `dutchie_config`; location | Yes | Cron maps `cronRunner.ts:142`, skip branch `:92`, execute `:181-190`; cron API `route.ts:11` | WIRED | No | Manual sync also respects it. |
| `syncCustomers` | Dutchie | Same; location eligibility for org entity | Yes | Cron maps `cronRunner.ts:143`; eligible-location filter `:63-66` | WIRED | No | Complete cron branch. |
| `syncProducts` | Dutchie | Same; location | Yes | Cron `cronRunner.ts:90-100,144` | WIRED | No | Complete cron/manual chain. |
| `syncInventory` | Dutchie | Same; location | Yes | Cron `cronRunner.ts:90-100,145` | WIRED | No | Complete cron/manual chain. |
| `syncRooms` | Dutchie | Same; location | Yes | Cron `cronRunner.ts:90-100,147` | WIRED | No | Complete cron/manual chain. |
| `syncTransactions` | Dutchie | Same; location | Yes | Cron `cronRunner.ts:90-100,148` | WIRED | No | Complete cron/manual chain. |
| `syncLoyalty` | Dutchie | Location config + `dutchie_sync_state.is_enabled`; organization | Risk: nontransactional dual write | Cron org gate `cronRunner.ts:62`; loyalty branch `loyaltySync.ts:112-125` | WIRED | No | Runtime prefers org state, then location fallback. |
| `designatedLoyaltyLocationId` | Dutchie | `dutchie_sync_state`; organization | Risk: same dual write | Selection branch `cronRunner.ts:73-80` | WIRED | No | Correct org scope. |

#### Fees, labels, and limits (9 rows)

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Fee identity: `name` | Fees | `fees_donations`; location | **No:** create lacks location; edit route absent | None (`NEG-FEES`) | BROKEN-WRITE | N/A | `/api/fees-donations/[id]` does not exist. |
| `fee_type` | Fees | Same; location | **No** | None (`NEG-FEES`) | BROKEN-WRITE | N/A | Create/edit broken; no runtime application. |
| `amount` | Fees | Same; location | **No** | None (`NEG-FEES`) | BROKEN-WRITE | N/A | Same. |
| Active status | Fees | Same; location | **No:** target route absent | None (`NEG-FEES`) | BROKEN-WRITE | N/A | Deactivate/reactivate both target absent route. |
| Label identity: `name` | Labels | `label_templates`; organization | Backend yes; UI hides errors | Inventory print modal `EnhancedPrintLabelsModal.tsx:38-45,118-123`; mounted `inventory/page.tsx:1621-1629` | WIRED | No | Intended display/selection effect. |
| `label_type` | Labels | Same; organization | Backend yes; UI hides errors | None (`NEG-LABEL-TYPE`) | PLACEHOLDER | No | No filter/format/routing branch. |
| `width_mm` | Labels | Same; organization | Backend yes; UI hides errors | Output dimensions `labelService.ts:119-141`; generate call `EnhancedPrintLabelsModal.tsx:59-78` | WIRED | No | Complete print chain. |
| `height_mm` | Labels | Same; organization | Backend yes; UI hides errors | Output dimensions `labelService.ts:121-141`; same generate call | WIRED | No | Complete print chain. |
| Purchase limits page | Limits | None | N/A | None | STATIC/REFERENCE | N/A | Hardcoded text only `settings/limits/page.tsx:5-14`. |

#### Printers and print service (13 rows)

The default USB form emits `ip_address: null` and `port: null` (`settings/printers/page.tsx:115-128`) while create/update schemas reject null (`api/settings/printers/route.ts:15-16`, `[id]/route.ts:16-17`). No production print routing reads these tables.

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Printer identity: `name` | Printers | `printers`; location | Conditional: blank IP/port blocks form | None (`NEG-PRINTER`) | PLACEHOLDER | N/A | Settings-only. |
| `printer_id` | Printers | Same; location | Conditional | None (`NEG-PRINTER`) | PLACEHOLDER | N/A | No job router. |
| `printer_type` | Printers | Same; location | Conditional | None (`NEG-PRINTER`) | PLACEHOLDER | N/A | No ESC/POS/ZPL/Brother/PDF branch. |
| `computer_name` | Printers | Same; location | Conditional | None (`NEG-PRINTER`) | PLACEHOLDER | N/A | No routing branch. |
| `connection_type` | Printers | Same; location | Conditional | None (`NEG-PRINTER`) | PLACEHOLDER | N/A | No connection branch. |
| `ip_address` | Printers | Same; location | **No when blank/clearing** | None (`NEG-PRINTER`) | BROKEN-WRITE | N/A | UI null; schema rejects null. |
| `port` | Printers | Same; location | **No when blank/clearing** | None (`NEG-PRINTER`) | BROKEN-WRITE | N/A | UI null; schema rejects null. |
| `supports_labels` | Printers | Same; location | Conditional | None (`NEG-PRINTER`) | PLACEHOLDER | N/A | No selection filter. |
| `supports_receipts` | Printers | Same; location | Conditional | None (`NEG-PRINTER`) | PLACEHOLDER | N/A | No selection filter. |
| Active status | Printers | Same; location | Yes once row exists | None outside settings (`NEG-PRINTER`) | PLACEHOLDER | N/A | Only changes settings list. |
| `service_type` | Print service | `print_service_config`; location | Conditional: blank email blocks save | None (`NEG-PRINT-SVC`) | PLACEHOLDER | N/A | No direct/cloud branch. |
| `apiKey` | Print service | `api_key_encrypted`; location | Conditional | None (`NEG-PRINT-SVC`) | PLACEHOLDER | N/A | Stored directly. |
| `account_email` | Print service | `print_service_config`; location | **No when blank/clearing** | None (`NEG-PRINT-SVC`) | BROKEN-WRITE | N/A | UI sends blank; schema requires valid email. |

#### Receipts (13 rows)

Each row writes nested `location_settings.settings.receipt` for a location. UI and service swallow failures, and delayed saves send a whole nested snapshot, creating leaf-level clobber risk. The registry default is true for every leaf; missing config renders every checkbox false. The settings-only preview is not a production receipt consumer.

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| `receipt.show_location_name` | Receipts | Nested JSON; location | **No:** errors + snapshot clobber | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes:** true → false | Preview alone treats missing as true. |
| `receipt.show_location_address` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | No terminal renderer branch. |
| `receipt.show_location_phone` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | Same. |
| `receipt.show_license_number` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | Same. |
| `receipt.show_employee_name` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | Same. |
| `receipt.show_customer_name` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | Same. |
| `receipt.show_sku` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | Parent and leaf searched separately. |
| `receipt.show_thc_percentage` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | No terminal branch. |
| `receipt.show_tax_breakdown` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | Same. |
| `receipt.show_discount_details` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | Same. |
| `receipt.show_loyalty_points` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | Same. |
| `receipt.show_return_policy` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | Same. |
| `receipt.show_biotrack_id` | Receipts | Same; location | **No** | None (`NEG-RECEIPT`) | PLACEHOLDER | **Yes** | Same. |

#### Registers, rooms, and taxes (9 rows)

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Register identity: `name` | Registers | `registers`; location/register | **No for create:** location omitted | Report display `reportingService.ts:208` | BROKEN-WRITE | N/A | Existing edit can work, but create fails first. |
| `auto_print_receipts` | Registers | Same; register/location | **No for create** | None (`NEG-AUTOPRINT`) | BROKEN-WRITE | Concept mismatch | Three auto-print stores, no consumer. |
| Active status | Registers | Same; register/location | **No:** deactivate DB result ignored | Active register readers exist | BROKEN-WRITE | N/A | Control-specific silent failure. |
| Room identity: `name` | Rooms | `rooms`; location | **No:** location omitted | Inventory/receiving `/api/rooms`, e.g. `inventory/page.tsx:861`, `ManualReceiveForm.tsx:56` | BROKEN-WRITE | N/A | API passes `{name}` into table requiring location. |
| Tax identity: `name` | Taxes | `tax_rates`; location | **No:** posts `location_id: undefined` | Applied-rate display `taxCalculator.ts:36-42` | BROKEN-WRITE | N/A | Missing location; five-minute stale cache. |
| `rate_percent` | Taxes | Same; location | **No** | Monetary branch `taxCalculator.ts:34-40`; checkout `transactionService.ts:66` | BROKEN-WRITE | N/A | No mutation invalidates loader. |
| `is_excise` | Taxes | Same; location | **No** | Excise/GRT branch `taxCalculator.ts:41-47` | BROKEN-WRITE | N/A | Same. |
| `applies_to` | Taxes | Same; location | **No** | Medical/recreational branch `taxCalculator.ts:26-27` | BROKEN-WRITE | N/A | Same. |
| Active status | Taxes | Same; location | **No:** delete result ignored | Loader filter `taxRateLoader.ts:27-29` | BROKEN-WRITE | N/A | Cache remains stale up to five minutes. |

### `/registers/configure/*` (191 rows)

The settings API uses a nontransactional JSON read/merge/upsert (`api/registers/configure/settings/route.ts:46-65`). Cards and most tabs do not check PATCH failures.

#### Index, guestlist, and workflow (22 rows)

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Configure index | `/registers/configure` | None | N/A | Redirect `page.tsx:4` | REDIRECT/ALIAS | N/A | Redirects to guestlist. |
| Guestlist status identity: `name` | Guestlist | `guestlist_statuses`; location | Yes | Terminal queue returns/displays status `api/terminal/queue/route.ts:71-98,185-205` | WIRED | N/A | Intended identity display works. |
| Guestlist status `color` | Guestlist | Same; location | Yes | None outside configuration (`NEG-GUESTLIST`) | PLACEHOLDER | N/A | Terminal queue does not consume color. |
| Guestlist status `sort_order` | Guestlist | Same; location | Yes | Queue ordering `api/terminal/queue/route.ts:71-98` | WIRED | N/A | Complete terminal chain. |
| Guestlist status active lifecycle | Guestlist | Same; location | Yes | Active status filter `api/terminal/queue/route.ts:71-98` | WIRED | N/A | Complete terminal chain. |
| `default_status_id` | Guestlist | `location_settings.settings`; location | Risk: JSON merge | Alternate `guestlist_statuses.is_default`, then sort order `api/terminal/queue/route.ts:71-98` | DRIFT | Registry uses prefixed key | UI key is unread; runtime selects from status rows. |
| `preorder_notify_status_id` | Guestlist | Same; location | Risk | None (`NEG-GUESTLIST`) | PLACEHOLDER | Registry key differs | No runtime mapping. |
| `online_pickup_status_id` | Guestlist | Same; location | Risk | None (`NEG-GUESTLIST`) | PLACEHOLDER | Registry key differs | No runtime mapping. |
| `online_delivery_status_id` | Guestlist | Same; location | Risk | None (`NEG-GUESTLIST`) | PLACEHOLDER | Registry key differs | No runtime mapping. |
| `in_store_order_status_id` | Guestlist | Same; location | Risk | None (`NEG-GUESTLIST`) | PLACEHOLDER | Registry key differs | No runtime mapping. |
| `curbside_status_id` | Guestlist | Same; location | Risk | None (`NEG-GUESTLIST`) | PLACEHOLDER | Registry key differs | No runtime mapping. |
| `drive_thru_status_id` | Guestlist | Same; location | Risk | None (`NEG-GUESTLIST`) | PLACEHOLDER | Registry key differs | No runtime mapping. |
| `skipped_delivery_status_id` | Guestlist | Same; location | Risk | None (`NEG-GUESTLIST`) | PLACEHOLDER | Registry key differs | No runtime mapping. |
| `ready_for_delivery_status_id` | Guestlist | Same; location | Risk | None (`NEG-GUESTLIST`) | PLACEHOLDER | Registry key differs | No runtime mapping. |
| `start_delivery_route_status_id` | Guestlist | Same; location | Risk | None (`NEG-GUESTLIST`) | PLACEHOLDER | Registry key differs | No runtime mapping. |
| `enabled_order_types.walk_in` | Workflow | `location_settings.settings`; location | Risk: JSON merge; UI ignores response | None (`NEG-WORKFLOW`) | PLACEHOLDER | N/A | No order-availability branch. |
| `enabled_order_types.curbside` | Workflow | Same; location | Risk | None (`NEG-WORKFLOW`) | PLACEHOLDER | N/A | Same. |
| `enabled_order_types.pickup` | Workflow | Same; location | Risk | None (`NEG-WORKFLOW`) | PLACEHOLDER | N/A | Same. |
| `enabled_order_types.delivery` | Workflow | Same; location | Risk | None (`NEG-WORKFLOW`) | PLACEHOLDER | N/A | Same. |
| `workflow_type` | Workflow | Same; location | Risk | None (`NEG-WORKFLOW`) | PLACEHOLDER | N/A | No terminal branch. |
| `default_order_source` | Workflow | Same; location | Risk | None (`NEG-WORKFLOW`) | PLACEHOLDER | N/A | No defaulting branch. |
| Order-source identity/lifecycle | Workflow | `order_sources`; organization/location association | Yes | None outside config (`NEG-WORKFLOW`) | PLACEHOLDER | N/A | Persisted list has no production consumer. |

#### Customer cards (162 rows)

There are six independently persisted status objects and 27 independently mutable checkboxes per status (`cards/page.tsx:18-55,82-117`). Parent-key search found no runtime consumer; the preview is settings-only. Every row below is PLACEHOLDER.

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| `customer_card_fields.online_order_placed.address` | Cards | Nested JSON; location | Risk: whole JSON; UI ignores response | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.customer_name` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.date_received` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.discount_group` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.drivers_license_number` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.loyal_vs_non_loyal` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.medical_card_id` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.nickname` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.order_source` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.payment_status` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.register` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.state` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.total_value_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.transaction_reference` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.customer_dob` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.customer_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.delivery_vehicle` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.drivers_license_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.last_purchase_date` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.med_card_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.new_vs_existing` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.num_items_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.order_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.pronouns` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.room` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.time_window` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.online_order_placed.transaction_notes` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.address` | Cards | Nested JSON; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.customer_name` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.date_received` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.discount_group` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.drivers_license_number` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.loyal_vs_non_loyal` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.medical_card_id` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.nickname` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.order_source` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.payment_status` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.register` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.state` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.total_value_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.transaction_reference` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.customer_dob` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.customer_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.delivery_vehicle` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.drivers_license_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.last_purchase_date` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.med_card_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.new_vs_existing` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.num_items_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.order_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.pronouns` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.room` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.time_window` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.walk_in.transaction_notes` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.address` | Cards | Nested JSON; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.customer_name` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.date_received` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.discount_group` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.drivers_license_number` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.loyal_vs_non_loyal` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.medical_card_id` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.nickname` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.order_source` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.payment_status` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.register` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.state` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.total_value_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.transaction_reference` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.customer_dob` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.customer_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.delivery_vehicle` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.drivers_license_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.last_purchase_date` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.med_card_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.new_vs_existing` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.num_items_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.order_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.pronouns` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.room` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.time_window` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.checked_in.transaction_notes` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.address` | Cards | Nested JSON; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.customer_name` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.date_received` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.discount_group` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.drivers_license_number` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.loyal_vs_non_loyal` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.medical_card_id` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.nickname` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.order_source` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.payment_status` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.register` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.state` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.total_value_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.transaction_reference` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.customer_dob` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.customer_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.delivery_vehicle` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.drivers_license_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.last_purchase_date` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.med_card_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.new_vs_existing` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.num_items_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.order_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.pronouns` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.room` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.time_window` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.in_progress.transaction_notes` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.address` | Cards | Nested JSON; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.customer_name` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.date_received` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.discount_group` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.drivers_license_number` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.loyal_vs_non_loyal` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.medical_card_id` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.nickname` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.order_source` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.payment_status` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.register` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.state` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.total_value_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.transaction_reference` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.customer_dob` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.customer_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.delivery_vehicle` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.drivers_license_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.last_purchase_date` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.med_card_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.new_vs_existing` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.num_items_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.order_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.pronouns` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.room` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.time_window` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.ready.transaction_notes` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.address` | Cards | Nested JSON; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.customer_name` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.date_received` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.discount_group` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.drivers_license_number` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.loyal_vs_non_loyal` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.medical_card_id` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.nickname` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.order_source` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.payment_status` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.register` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.state` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.total_value_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.transaction_reference` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.customer_dob` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.customer_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.delivery_vehicle` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.drivers_license_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.last_purchase_date` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.med_card_exp` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.new_vs_existing` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.num_items_in_cart` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.order_type` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.pronouns` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.room` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.time_window` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |
| `customer_card_fields.completed.transaction_notes` | Cards | Same; location | Risk | None (`NEG-CARDS`) | PLACEHOLDER | N/A | Preview only. |

#### Reasons and register settings (7 rows)

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Adjustment-reason identity/lifecycle | Adjustments | `transaction_reasons`; organization, type `adjustment` | Yes; UI feedback limited | None (`NEG-REASONS`) | PLACEHOLDER | N/A | No transaction branch reads reason configuration. |
| Return-reason identity/lifecycle | Returns | Same; organization, type `return` | Yes; UI feedback limited | None (`NEG-REASONS`) | PLACEHOLDER | N/A | Same. |
| Cancellation-reason identity/lifecycle | Cancellations | Same; organization, type `cancellation` | Yes; UI feedback limited | None (`NEG-REASONS`) | PLACEHOLDER | N/A | Same. |
| Void-reason identity/lifecycle | Voids | Same; organization, type `void` | Yes; UI feedback limited | None (`NEG-REASONS`) | PLACEHOLDER | N/A | Same. |
| `restrict_transaction_hours` | Register settings | `location_settings.settings`; location | Risk: JSON merge | None (`NEG-REGISTER-HOURS`) | PLACEHOLDER | N/A | No terminal time gate. |
| `transaction_hours_start` | Register settings | Same; location | Risk | None (`NEG-REGISTER-HOURS`) | PLACEHOLDER | N/A | No terminal time gate. |
| `transaction_hours_end` | Register settings | Same; location | Risk | None (`NEG-REGISTER-HOURS`) | PLACEHOLDER | N/A | No terminal time gate. |

### `/customers/configure/*` and referrals-adjacent customer configuration (64 rows)

#### Index, doctors, conditions, and field visibility (54 rows)

The field writer checks errors but performs a nontransactional whole-settings read/upsert (`api/customers/configure/fields/route.ts:43-62`). No customer form, terminal, or API reads `customer_field_visibility` outside this configuration endpoint (`NEG-CUSTOMER-FIELDS`).

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Configure index | `/customers/configure` | None | N/A | Client replace to doctors `page.tsx:7-9` | REDIRECT/ALIAS | N/A | Alias only. |
| Doctor identity/contact/license | Doctors | `doctors`; organization | Yes | None outside config (`NEG-CUSTOMER-REF`) | PLACEHOLDER | N/A | Customer flows do not consume configured doctors. |
| Condition identity/description | Qualifying conditions | `qualifying_conditions`; organization | Yes | None outside config (`NEG-CUSTOMER-REF`) | PLACEHOLDER | N/A | No customer eligibility branch. |
| `customer_field_visibility.pos.name` | Customer fields | Nested JSON; location | Risk: whole-settings upsert | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Configuration-only. |
| `customer_field_visibility.pos.dob` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.referred_by` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.phone` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.mobile_phone` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.email` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.drivers_license` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.drivers_license_exp` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.street` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.city` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.zip` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.state` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.mmj_id` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.mmj_id_exp` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.prefix` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.middle_name` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.suffix` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.nickname` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.gender` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.pos.last_name` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.name` | Customer fields | Nested JSON; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Configuration-only. |
| `customer_field_visibility.backend.id_expiration` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.address1` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.address2` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.city` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.state` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.zip` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.status` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.dob` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.drivers_license` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.drivers_license_exp` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.phone` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.mobile_phone` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.email` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.middle_name` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.suffix` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.gender` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.notes` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.caregiver_first` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.caregiver_last` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.caregiver_phone` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.caregiver_email` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.prefix` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.mmj_id` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.backend.last_name` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.prescription.rx_number` | Customer fields | Nested JSON; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Configuration-only. |
| `customer_field_visibility.prescription.electronic` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.prescription.product` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.prescription.unit` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.prescription.quantity` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |
| `customer_field_visibility.prescription.notes` | Customer fields | Same; location | Risk | None (`NEG-CUSTOMER-FIELDS`) | PLACEHOLDER | N/A | Same. |

#### Badge priority and badges (10 rows)

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Badge priority order | Badge priority | Segment/badge priority; organization | **No:** API returns `segment_id`/`badge_color`; UI submits undefined `id`/`color` | Priority display intended but writer corrupt | BROKEN-WRITE | N/A | Shape mismatch `badge-priority/page.tsx:7-11,54-57,94-103`; API `route.ts:27-80`. |
| Badge identity: `name` | Badges | `badges`; organization | Yes | Active selector API `api/badges/route.ts:26-36,59-64`; option rendering `customers/[id]/page.tsx:91-93,113,128-134` | WIRED | N/A | Assigned-badge shape is broken, but the independent active selector/display chain is complete. |
| `color` | Badges | Same; organization | Yes | Same broken nested/flat handoff | PARTIAL | N/A | Missing final display link. |
| `icon` | Badges | Same; organization | Yes | Same broken nested/flat handoff | PARTIAL | N/A | Missing final display link. |
| `description` | Badges | Same; organization | Yes | None (`NEG-BADGE`) | PLACEHOLDER | N/A | No behavior/display consumer. |
| `assignment_method` | Badges | Same; organization | Yes | None (`NEG-BADGE`) | PLACEHOLDER | N/A | No assignment engine. |
| `segment_id` | Badges | Same; organization | Yes | None (`NEG-BADGE`) | PLACEHOLDER | N/A | No segment-driven assignment. |
| `show_in_register` | Badges | Same; organization | Yes | None (`NEG-BADGE`) | PLACEHOLDER | N/A | No register display branch. |
| Active lifecycle | Badges | Same; organization | Yes | Active-list branch `api/badges/route.ts:26-36,59-64`; customer selector `customers/[id]/page.tsx:91-93,113,128-134` | WIRED | N/A | Complete list-selection behavior. |
| Manual badge membership | Badges | Membership relation; organization/customer | **No:** UI scalar bodies; API requires `customer_ids[]` | Membership API `api/badges/[id]/members/route.ts:8-86` | BROKEN-WRITE | N/A | Writer contract mismatch. |

### Product configuration and aliases (80 rows)

#### Redirect aliases (7 rows)

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Categories alias | `/products/categories` | None | N/A | Redirect to `/products/configure?tab=categories` | REDIRECT/ALIAS | N/A | No writer here. |
| Kits alias | `/products/kits` | None | N/A | Redirect to `?tab=packing-lists` | REDIRECT/ALIAS | N/A | No writer here. |
| Adjustment reasons alias | `/settings/adjustment-reasons` | None | N/A | Redirect `page.tsx:4` | REDIRECT/ALIAS | N/A | Targets inventory-adjustments tab. |
| Dosages alias | `/settings/dosages` | None | N/A | Redirect `page.tsx:4` | REDIRECT/ALIAS | N/A | Targets dosages tab. |
| Inventory statuses alias | `/settings/inventory-statuses` | None | N/A | Redirect `page.tsx:4` | REDIRECT/ALIAS | N/A | Targets inventory-statuses tab. |
| Package formats alias | `/settings/package-formats` | None | N/A | Redirect `page.tsx:4` | REDIRECT/ALIAS | N/A | Targets formats tab. |
| Product fields alias | `/settings/product-fields` | None | N/A | Redirect `page.tsx:4` | REDIRECT/ALIAS | N/A | Targets fields tab. |

#### Categories and pricing (16 rows)

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Category identity: `name`, `slug`, `description` | Categories | `product_categories`; organization | Yes | Name display/filter `terminal/CategoryGrid.tsx:30-32,43-49,63-71` | PARTIAL | N/A | Name is consumed; slug and description are not. |
| `master_category` | Categories | Same; organization | Yes | Terminal behavior `CategoryGrid.tsx:30-71`; loader `api/categories/route.ts:11-16` | PARTIAL | N/A | Behavioral branch exists, but API omits organization filter. |
| `parent_id` | Categories | Same; organization | Yes | None outside config (`NEG-CATEGORIES`) | PLACEHOLDER | N/A | No hierarchy behavior. |
| `tax_category` | Categories | Same; organization | Yes | Product/category load `api/products/[id]/route.ts:23`; transaction tax path `transactionService.ts:135-168` | WIRED | N/A | Complete checkout classification chain. |
| `purchase_limit_category` | Categories | Same; organization | Yes | Purchase-limit calculation `transactionService.ts:135-168` | WIRED | N/A | Complete checkout chain. |
| `available_for` | Categories | Same; organization | Yes | Runtime consumes product-level `products.available_for` | DRIFT | N/A | Category value is unread; equivalent product field governs behavior. |
| `sort_order` | Categories | Same; organization | Yes | Terminal ordering `CategoryGrid.tsx:30-71`; loader `api/categories/route.ts:11-16` | PARTIAL | N/A | API omits organization filter. |
| `regulatory_category` | Categories | Same; organization | Yes | Runtime consumes product-level `products.regulatory_category` | DRIFT | N/A | Category value is unread. |
| `default_flower_equivalent` | Categories | Same; organization | **No:** UI sends it; POST/PATCH omit it | Intended purchase-limit path | BROKEN-WRITE | N/A | Omitted by `api/categories/route.ts:81-95` and `[id]/route.ts:44-48`. |
| Active lifecycle | Categories | Same; organization | Yes | Active loader `api/categories/route.ts:11-16`; terminal `CategoryGrid.tsx:30-71` | PARTIAL | N/A | Active behavior exists, but loader omits organization filter. |
| Pricing-group identity: name/description | Pricing | `pricing_tier_groups`; organization | **No:** description discarded | None beyond configuration | BROKEN-WRITE | N/A | Create/update omit description `pricing-tier-groups/route.ts:43-48`, `[id]/route.ts:20-27`. |
| Pricing-group lifecycle | Pricing | Same; organization | **No:** UI promises ungrouping; API only deactivates | N/A | BROKEN-WRITE | N/A | Leaves tiers grouped `pricing-tier-groups/[id]/route.ts:62-66`. |
| Pricing-tier identity: `name` | Pricing | `pricing_tiers`; organization | Yes | Product API `api/products/[id]/route.ts:65-93`; selector renders names `ProductForm.tsx:1073-1080` | WIRED | N/A | Intended selection/display effect. |
| `multiplier` | Pricing | Same; organization | Yes | Returned/displayed by pricing API, never applied to price | PARTIAL | N/A | Missing calculation link. |
| `group_id` | Pricing | Same; organization | **No for “No group”:** POST requires ID | N/A | BROKEN-WRITE | N/A | UI permits a value the API rejects `pricing-tiers/route.ts:43-58`. |
| Pricing-tier lifecycle | Pricing | Same; organization | Yes | Product API active filter `api/products/[id]/route.ts:65-71`; selector `ProductForm.tsx:1073-1080` | WIRED | N/A | Complete selection behavior. |

#### Product field configuration (39 rows)

Every row writes `location_settings.settings.product_field_config.<key>` at location scope. The service checks errors but uses a nontransactional read/merge/write (`productFieldConfigService.ts:91-161`). `ProductForm` loads the location config and applies hide/show/required branches (`ProductForm.tsx:118-127,139-170,1074-1080`). The registry omits the entire parent key.

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| `product_field_config.name` | Product fields | Nested JSON; location | Risk: nontransactional merge | `ProductForm.tsx:605-608` | WIRED | N/A | Form visibility/required behavior. |
| `product_field_config.sku` | Product fields | Same; location | Risk | `ProductForm.tsx:617-620` | WIRED | N/A | Same. |
| `product_field_config.barcode` | Product fields | Same; location | Risk | `ProductForm.tsx:624-627` | WIRED | N/A | Same. |
| `product_field_config.description` | Product fields | Same; location | Risk | `ProductForm.tsx:924-926` | WIRED | N/A | Same. |
| `product_field_config.category` | Product fields | Same; location | Risk | `ProductForm.tsx:671-674` | WIRED | N/A | Same. |
| `product_field_config.brand` | Product fields | Same; location | Risk | `ProductForm.tsx:681-685` | WIRED | N/A | Same. |
| `product_field_config.vendor` | Product fields | Same; location | Risk | `ProductForm.tsx:697-701` | WIRED | N/A | Same. |
| `product_field_config.strain` | Product fields | Same; location | Risk | `ProductForm.tsx:713-717` | WIRED | N/A | Same. |
| `product_field_config.rec_price` | Product fields | Same; location | Risk | `ProductForm.tsx:750-753` | WIRED | N/A | Same. |
| `product_field_config.med_price` | Product fields | Same; location | Risk | `ProductForm.tsx:757-760` | WIRED | N/A | Same. |
| `product_field_config.cost_price` | Product fields | Same; location | Risk | `ProductForm.tsx:764-767` | WIRED | N/A | Same. |
| `product_field_config.weight_grams` | Product fields | Same; location | Risk | `ProductForm.tsx:774-777` | WIRED | N/A | Same. |
| `product_field_config.thc_percentage` | Product fields | Same; location | Risk | `ProductForm.tsx:781-784` | WIRED | N/A | Same. |
| `product_field_config.cbd_percentage` | Product fields | Same; location | Risk | `ProductForm.tsx:788-791` | WIRED | N/A | Same. |
| `product_field_config.thc_content_mg` | Product fields | Same; location | Risk | `ProductForm.tsx:795-798` | WIRED | N/A | Same. |
| `product_field_config.cbd_content_mg` | Product fields | Same; location | Risk | `ProductForm.tsx:802-805` | WIRED | N/A | Same. |
| `product_field_config.flower_equivalent` | Product fields | Same; location | Risk | `ProductForm.tsx:809-812` | WIRED | N/A | Same. |
| `product_field_config.external_category` | Product fields | Same; location | Risk | `ProductForm.tsx:729-732` | WIRED | N/A | Same. |
| `product_field_config.regulatory_category` | Product fields | Same; location | Risk | `ProductForm.tsx:1130-1132` | WIRED | N/A | Same. |
| `product_field_config.online_title` | Product fields | Same; location | Risk | `ProductForm.tsx:1125-1127` | WIRED | N/A | Same. |
| `product_field_config.online_description` | Product fields | Same; location | Risk | `ProductForm.tsx:1142-1145` | WIRED | N/A | Same. |
| `product_field_config.alternate_name` | Product fields | Same; location | Risk | `ProductForm.tsx:631-634` | WIRED | N/A | Same. |
| `product_field_config.producer` | Product fields | Same; location | Risk | `ProductForm.tsx:638-642` | WIRED | N/A | Same. |
| `product_field_config.size` | Product fields | Same; location | Risk | `ProductForm.tsx:654-657` | WIRED | N/A | Same. |
| `product_field_config.flavor` | Product fields | Same; location | Risk | `ProductForm.tsx:661-664` | WIRED | N/A | Same. |
| `product_field_config.available_for` | Product fields | Same; location | Risk | `ProductForm.tsx:736-739` | WIRED | N/A | Same. |
| `product_field_config.is_taxable` | Product fields | Same; location | Risk | `ProductForm.tsx:942-946` | WIRED | N/A | Same. |
| `product_field_config.allow_automatic_discounts` | Product fields | Same; location | Risk | `ProductForm.tsx:948-952` | WIRED | N/A | Same. |
| `product_field_config.dosage` | Product fields | Same; location | Risk | `ProductForm.tsx:816-819` | WIRED | N/A | Same. |
| `product_field_config.net_weight` | Product fields | Same; location | Risk | `ProductForm.tsx:826-830` | WIRED | N/A | Same. |
| `product_field_config.gross_weight` | Product fields | Same; location | Risk | `ProductForm.tsx:841-844` | WIRED | N/A | Same. |
| `product_field_config.unit_thc_dose` | Product fields | Same; location | Risk | `ProductForm.tsx:848-851` | WIRED | N/A | Same. |
| `product_field_config.unit_cbd_dose` | Product fields | Same; location | Risk | `ProductForm.tsx:855-858` | WIRED | N/A | Same. |
| `product_field_config.administration_method` | Product fields | Same; location | Risk | `ProductForm.tsx:862-865` | WIRED | N/A | Same. |
| `product_field_config.package_size` | Product fields | Same; location | Risk | `ProductForm.tsx:869-872` | WIRED | N/A | Same. |
| `product_field_config.external_sub_category` | Product fields | Same; location | Risk | `ProductForm.tsx:1135-1137` | WIRED | N/A | Same. |
| `product_field_config.allergens` | Product fields | Same; location | Risk | `ProductForm.tsx:1024-1026` | WIRED | N/A | Same. |
| `product_field_config.ingredients` | Product fields | Same; location | Risk | `ProductForm.tsx:1029-1031` | WIRED | N/A | Same. |
| `product_field_config.instructions` | Product fields | Same; location | Risk | `ProductForm.tsx:1034-1036` | WIRED | N/A | Same. |

#### Statuses, adjustments, dosages, kits, and formats (18 rows)

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Inventory-status identity: name/description | Inventory statuses | `inventory_statuses`; organization | Yes | None outside config (`NEG-PRODUCT-REF`) | PLACEHOLDER | N/A | No inventory behavior reads it. |
| Inventory-status `color` | Inventory statuses | Same; organization | Yes | None (`NEG-PRODUCT-REF`) | PLACEHOLDER | N/A | No display consumer. |
| Inventory-status lifecycle | Inventory statuses | Same; organization | Yes | None (`NEG-PRODUCT-REF`) | PLACEHOLDER | N/A | Only configuration listing changes. |
| Adjustment-reason identity | Inventory adjustments | `adjustment_reasons`; organization | Yes | None (`NEG-PRODUCT-REF`) | PLACEHOLDER | N/A | Adjustment flows do not load it. |
| Adjustment-reason lifecycle | Inventory adjustments | Same; organization | Yes | None (`NEG-PRODUCT-REF`) | PLACEHOLDER | N/A | Same. |
| Dosage identity: `name` | Dosages | `dosage_presets`; organization | Yes | Product form loads names `ProductForm.tsx:150,164-169` and renders datalist `:816-823` | WIRED | N/A | Intended selection effect. |
| `thc_mg` | Dosages | Same; organization | Yes | None outside config (`NEG-DOSAGE`) | PLACEHOLDER | N/A | Not applied to product/dose behavior. |
| `cbd_mg` | Dosages | Same; organization | Yes | None (`NEG-DOSAGE`) | PLACEHOLDER | N/A | Same. |
| `serving_size` | Dosages | Same; organization | Yes | None (`NEG-DOSAGE`) | PLACEHOLDER | N/A | Same. |
| Dosage lifecycle | Dosages | Same; organization | Yes | API filters active presets `api/settings/dosages/route.ts:11-16`; ProductForm renders returned names `ProductForm.tsx:816-823` | WIRED | N/A | Complete selection branch. |
| Kit identity | Packing lists/kits | Kit tables; organization | Yes | None outside config (`NEG-KIT`) | PLACEHOLDER | N/A | No sale/assembly consumer. |
| Kit price | Packing lists/kits | Same; organization | Yes | None (`NEG-KIT`) | PLACEHOLDER | N/A | Not applied at checkout. |
| Kit composition/quantity | Packing lists/kits | Same; organization | Yes | None (`NEG-KIT`) | PLACEHOLDER | N/A | No build/explode behavior. |
| Kit lifecycle | Packing lists/kits | Same; organization | Yes | None (`NEG-KIT`) | PLACEHOLDER | N/A | Configuration-only. |
| Package-format identity | Package formats | `location_settings.settings.package_id_formats`; location | Risk: JSON merge | Preview only; generator has no production caller (`NEG-FORMAT`) | PLACEHOLDER | N/A | Parent key missing from registry. |
| Package-format category | Package formats | Same; location | Risk | None (`NEG-FORMAT`) | PLACEHOLDER | N/A | No receive/generation selector. |
| Package-format template | Package formats | Same; location | Risk | Only config preview `packageFormatService.ts:105-113`; no production application (`NEG-FORMAT`) | PLACEHOLDER | N/A | Actual package entry uses separate logic. |
| Package-format lifecycle | Package formats | Same; location | Risk | None (`NEG-FORMAT`) | PLACEHOLDER | N/A | Configuration-only. |

### Marketing, loyalty, referrals, campaigns, workflows, events, and templates (61 rows)

#### Loyalty, referrals, and marketing configure (17 rows)

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| `accrual_rate` | Loyalty | `loyalty_config`; organization | Yes | Accrual calculation directly queries any active row `transactionService.ts:229-241` | PARTIAL | N/A | Writer/UI service scopes by organization, but transaction bypasses it and omits the organization filter. |
| `initial_signup_reward` | Loyalty | Same; organization | Yes | None (`NEG-LOYALTY`) | PLACEHOLDER | N/A | No signup award branch. |
| `enrollment_type` | Loyalty | Same; organization | Yes | None (`NEG-LOYALTY`) | PLACEHOLDER | N/A | No enrollment gate. |
| `online_description` | Loyalty | Same; organization | Yes | None (`NEG-LOYALTY`) | PLACEHOLDER | N/A | No storefront display branch. |
| `redemption_method` | Loyalty | Same; organization | Yes | None (`NEG-LOYALTY`) | PLACEHOLDER | N/A | No redemption strategy branch. |
| `point_expiration_days` | Loyalty | Same; organization | Yes | None (`NEG-LOYALTY`) | PLACEHOLDER | N/A | No expiration job. |
| `tiers_enabled` | Loyalty | Same; organization | Yes | None (`NEG-LOYALTY`) | PLACEHOLDER | N/A | No tier gate. |
| Loyalty-tier identity: `name` | Loyalty tiers | `loyalty_tiers`; intended config scope | **No:** writer uses `organization_id`, table requires `loyalty_config_id` | None | BROKEN-WRITE | N/A | Schema mismatch `types/database.ts:3376-3409`. |
| `min_points` | Loyalty tiers | Same | **No** | Intended tier selection | BROKEN-WRITE | N/A | Wrong foreign key blocks writer. |
| `multiplier` | Loyalty tiers | Same | **No** | Intended accrual/redemption | BROKEN-WRITE | N/A | Wrong foreign key blocks writer. |
| Loyalty-tier lifecycle | Loyalty tiers | Same | **No** | Intended tier availability | BROKEN-WRITE | N/A | Wrong foreign key blocks writer. |
| `referrer_reward_points` | Referrals | Referral config; organization | Yes | Behavioral checker `referralService.ts:66-94`, but no caller | PARTIAL | N/A | Complete local logic lacks production entry. |
| `referee_reward_points` | Referrals | Same; organization | Yes | Same unused checker | PARTIAL | N/A | Missing caller. |
| `min_purchase_amount` | Referrals | Same; organization | Yes | Same unused checker | PARTIAL | N/A | Missing caller. |
| Marketing-tag identity | Marketing configure | `marketing_tags`; organization | Yes; UI ignores errors | None outside config (`NEG-MARKETING-CONFIG`) | PLACEHOLDER | N/A | No campaign/segment consumer. |
| Marketing-tag lifecycle | Marketing configure | Same; organization | Yes; UI ignores errors | None (`NEG-MARKETING-CONFIG`) | PLACEHOLDER | N/A | Same. |
| `default_store_url` | Marketing configure | `location_settings.settings`; location | Risk: register-config JSON merge | None (`NEG-MARKETING-CONFIG`) | PLACEHOLDER | N/A | No storefront/campaign link consumer. |

#### Discounts (31 rows)

Discount rows are organization scoped with optional location constraints. Runtime loads active rows in `discountLoader.ts:20-88`, evaluates them in `discountEvaluator.ts:27-166`, and is reached through `transactionService.ts:105-122`. Update ignores rule edits; the mapper drops vendor/weight and retains only one filter type; recurrence is hardcoded off; first-time status is hardcoded false; discount cache is never invalidated.

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Discount identity: name/description | Discount builder | `discounts`; organization + optional locations | Yes | Loader/evaluator identifies applied discount `discountLoader.ts:20-88`, `discountEvaluator.ts:27-65` | PARTIAL | N/A | Name reaches output; description does not affect behavior. |
| `discount_stacking` | Discount builder | `discounts.discount_stacking`; organization | Yes | Stacking branch `discountEvaluator.ts:78-99`; transaction `transactionService.ts:105-122` | WIRED | N/A | Complete checkout chain. |
| `start_date` | Discount builder | `discounts.start_date`; organization | Yes | Date eligibility branch `discountEvaluator.ts:120`; transaction chain `transactionService.ts:105-122` | WIRED | N/A | Complete checkout chain. |
| `end_date` | Discount builder | `discounts.end_date`; organization | Yes | Date eligibility branch `discountEvaluator.ts:121`; transaction chain `transactionService.ts:105-122` | WIRED | N/A | Complete checkout chain. |
| `customer_types` | Discount builder | Discount filter; organization | Yes | Customer-type branch `discountEvaluator.ts:138-140`; transaction `transactionService.ts:105-122` | WIRED | N/A | Complete checkout branch. |
| Builder `status` | Discount builder | `discounts.status`; organization | Yes | Loader active filter `discountLoader.ts:20-55` | WIRED | N/A | Save Draft/Activate changes eligibility. |
| List deactivate lifecycle | Discount list | Same; organization | Yes | Loader active filter `discountLoader.ts:20-55` | WIRED | N/A | Complete checkout behavior. |
| `application_method` | Discount builder | `discounts.application_method`; organization | Yes | Loaded/evaluated, but manual selection has no UI consumer | PARTIAL | N/A | Automatic path works; manual path dead-ends. |
| Weekly recurrence toggle | Discount builder | Discount recurrence fields; organization | Yes | Loader hardcodes recurrence disabled `discountLoader.ts:106-107` | PARTIAL | N/A | Persisted value bypassed. |
| Weekly recurrence days | Discount builder | Same | Yes | Same hardcode | PARTIAL | N/A | Missing runtime mapping. |
| `recurrence_start_time` | Discount builder | Same | Yes | Same hardcode | PARTIAL | N/A | Missing runtime mapping. |
| `recurrence_end_time` | Discount builder | Same | Yes | Same hardcode | PARTIAL | N/A | Missing runtime mapping. |
| `first_time_customer_only` | Discount builder | Discount rule; organization | Yes | Transaction supplies hardcoded false `transactionService.ts:105-122` | PARTIAL | N/A | Branch exists but input never reflects customer history. |
| `requires_manager_approval` | Discount builder | `discounts`; organization | Yes | Flag loaded, no terminal approval branch | PARTIAL | N/A | Missing final gate. |
| Coupon `code` | Discount builder | Discount code; organization | Yes | None in POS/storefront (`NEG-COUPON`) | PLACEHOLDER | N/A | Coupon selection has no UI consumer. |
| Constraint threshold type | Discount builder | Discount rules; organization | **No:** update ignores rules | Intended evaluator | BROKEN-WRITE | N/A | `discountManagementService.ts:43-69`. |
| Constraint minimum value | Discount builder | Same | **No** | Intended evaluator | BROKEN-WRITE | N/A | Rule edit discarded. |
| Constraint category filter | Discount builder | Same | **No** | Intended matcher | BROKEN-WRITE | N/A | Rule edit/mapping loss. |
| Constraint brand filter | Discount builder | Same | **No** | Intended matcher | BROKEN-WRITE | N/A | Same. |
| Constraint strain filter | Discount builder | Same | **No** | Intended matcher | BROKEN-WRITE | N/A | Same. |
| Constraint vendor filter | Discount builder | Same | **No** | Intended matcher | BROKEN-WRITE | N/A | Mapper drops vendor. |
| Constraint weight filter | Discount builder | Same | **No** | Intended matcher | BROKEN-WRITE | N/A | Mapper drops weight. |
| Reward type | Discount builder | Discount rewards; organization | **No:** update ignores rewards | Intended evaluator | BROKEN-WRITE | N/A | Reward edit discarded. |
| Reward value | Discount builder | Same | **No** | Intended evaluator | BROKEN-WRITE | N/A | Same. |
| Reward apply-to | Discount builder | Same | **No:** never serialized | Intended evaluator | BROKEN-WRITE | N/A | UI value absent from payload. |
| Reward category filter | Discount builder | Same | **No** | Intended matcher | BROKEN-WRITE | N/A | Update/mapping loss. |
| Reward brand filter | Discount builder | Same | **No** | Intended matcher | BROKEN-WRITE | N/A | Same. |
| Reward strain filter | Discount builder | Same | **No** | Intended matcher | BROKEN-WRITE | N/A | Same. |
| Reward vendor filter | Discount builder | Same | **No** | Intended matcher | BROKEN-WRITE | N/A | Mapper drops vendor. |
| Reward weight filter | Discount builder | Same | **No** | Intended matcher | BROKEN-WRITE | N/A | Mapper drops weight. |
| List duplicate action | Discount list | New discount + rules/rewards; organization | **No:** clone path cannot reproduce rules/rewards | None reliable | BROKEN-WRITE | N/A | Duplicate loses behavioral configuration. |

#### Campaigns, workflows, events, and templates (13 rows)

| Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes |
|---|---|---|---|---|---|---|---|
| Campaign list | Campaigns | `campaigns`; organization | No writer on list | N/A | READ-ONLY | N/A | List/navigation surface only. |
| Campaign `subject` | Campaign editor | Same; organization | Yes | Send path `campaignService.ts:44-62` only logs and marks sent | PARTIAL | N/A | Reaches send record, not actual delivery. |
| `preview_text` | Campaign editor | Same; organization | Yes | Same logging-only path | PARTIAL | N/A | Missing delivery integration. |
| `sender_email` | Campaign editor | Same; organization | Yes | Same logging-only path | PARTIAL | N/A | Missing delivery integration. |
| `campaign_type` | Campaign editor | Same; organization | **No:** UI sends `type`; API accepts `campaign_type` | Intended campaign branch | BROKEN-WRITE | N/A | Contract mismatch `campaigns/[id]/page.tsx:369-399`, API `route.ts:8-21`. |
| Workflow active/pause | Marketing workflows | `workflows.status`; organization | **No:** UI sends `{action}`; PATCH accepts `status` | Trigger processor only logs and has no caller `workflowService.ts:40-49` | BROKEN-WRITE | N/A | Writer contract fails before incomplete processor. |
| Event identity | Events | `events`; organization | Yes | None outside config (`NEG-EVENT`) | PLACEHOLDER | N/A | No marketing/storefront display. |
| Event start date | Events | Same; organization | Yes | None (`NEG-EVENT`) | PLACEHOLDER | N/A | No scheduling branch. |
| Event end date | Events | Same; organization | Yes | None (`NEG-EVENT`) | PLACEHOLDER | N/A | No scheduling branch. |
| Event image URL | Events | Same; organization | Yes | None (`NEG-EVENT`) | PLACEHOLDER | N/A | No display branch. |
| Template `name` | Templates | `campaign_templates`; organization | Yes | Preview/substitution `templateService.ts:29-53`; send path does not render/deliver | PARTIAL | N/A | Preview works; campaign delivery link missing. |
| Template HTML content | Templates | Same; organization | Yes | Same preview/substitution API | PARTIAL | N/A | Missing send/render link. |
| Template lifecycle | Templates | Same; organization | Yes | None outside config (`NEG-TEMPLATE`) | PLACEHOLDER | N/A | Send path does not select active templates. |

## Concept-level source-of-truth matrix

This matrix links duplicate concepts even when every candidate is inert. “Runtime authority” means the value a behavioral path actually uses today, not the store the UI appears to nominate.

| Concept | All backing stores / keys | Runtime authority | Audit finding |
|---|---|---|---|
| Require customer | A `require_customer_checkout`; B `require_customer` | None; transaction accepts nullable customer | Two placeholders. |
| ID verification | A `require_id_scan`; B `require_id_verification` | None | Two placeholders. |
| Auto-print receipt | A `auto_print_receipt`; B `print_receipt_auto`; `registers.auto_print_receipts` | None | Three writers, no print branch. |
| Auto-print label | A `auto_print_label`; generated `registers.auto_print_labels`; per-entity label settings | Manual print flows only | No automatic sale-print authority. |
| Inventory deduction | A/B `auto_deduct_on_sale` in shared JSON; sale transaction SQL | SQL always decrements | Toggle cannot disable behavior. |
| Automatic discounts | B `auto_apply_discounts`; `discounts` rows and filters | `discounts` table | B is DRIFT; table evaluation is unconditional. |
| Manager approval | A `require_manager_discount_approval`; registry `manager_discount_threshold`; `discounts.requires_manager_approval` | Flag is loaded, but terminal has no approval gate | All candidate settings are incomplete/inert at checkout. |
| Purchase limits | B `enforce_purchase_limits`; `purchase_limits`; category/product classification | `purchase_limits` plus calculator fallback | B is DRIFT; static Limits page is not authority. |
| BioTrack enable/auto-sync | A `auto_sync_biotrack`; B `biotrack_auto_sync`; `biotrack_config.is_enabled`; environment client | No single authority: test/client loader honors table flag; sale/inventory paths bypass it | JSON keys DRIFT; table flag PARTIAL. |
| BioTrack REST credentials | `biotrack_config.rest_api_url`/username/password/UBI; `BIOTRACK_*` environment variables | Environment for sale/void/refund; table XML credentials for manifests | Split authority by workflow; table REST URL DRIFT. |
| BioTrack location ID | `biotrack_config.biotrack_location_id`; `locations.biotrack_location_id` | Manifest API prefers config, then location fallback | Both stores are live; needs one canonical location field. |
| Online ordering | B `enable_online_ordering`; `locations.allows_online_orders` | Neither; order API always accepts | Two inert stores. |
| Reservation enablement | B `enable_reservations`; `onlineOrderService` behavior | Service always reserves | Setting cannot govern behavior. |
| Low-stock threshold | B `low_stock_threshold`; hardcoded `5`; product/location low inventory fields | Advanced report hardcodes 5 | B is placeholder; thresholds are fragmented. |
| Receipt content | `location_settings.settings.receipt.*`; `receipt_config` (`header_config`, `line_item_config`, `footer_config`, `additional_config`) | Neither production receipt renderer reads either | JSON preview only; table is types-only. |
| Guestlist default/mappings | Registry `guestlist_*`; UI unprefixed aliases; `guestlist_statuses.is_default`/`sort_order` | Status table for default selection | UI `default_status_id` DRIFT; nine mappings placeholders; registry aliases unexposed. |
| Customer card fields | Registry parent `customer_card_fields`; nested per-status JSON writer | None outside settings preview | 162 placeholders. |
| Offline and reconnect | A `allow_offline_mode`, `auto_sync_reconnect`, `require_wifi`; service worker + sync worker | Unconditional terminal startup/workers | Settings cannot govern behavior. |
| Loyalty timing | A `apply_loyalty_before_tax`; `loyalty_config` | Fixed post-tax transaction flow | Timing key placeholder. |
| Loyalty enable/designation for Dutchie | `dutchie_config.sync_loyalty` location; `dutchie_sync_state.is_enabled` and `designated_location_id` organization | Cron prefers organization state, then location fallback | Dual nontransactional write can split authority. |
| Category availability | `product_categories.available_for`; `products.available_for` | Product field | Category value DRIFT. |
| Regulatory category | `product_categories.regulatory_category`; `products.regulatory_category` | Product field | Category value DRIFT. |
| Flower equivalence | Category `default_flower_equivalent`; product `flower_equivalent`; purchase-limit categories | Product/category calculation inputs, but category writer drops default | Category default BROKEN-WRITE. |
| Product form configuration | `location_settings.settings.product_field_config`; registry has no entry | Location JSON, consumed by ProductForm | WIRED but missing from registry. |
| Package ID formats | `location_settings.settings.package_id_formats`; config preview; separate package-entry formatting logic | Separate entry logic; config has no production caller | Placeholder and missing from registry. |
| Delivery limits | UI `max_delivery_value`/`max_delivery_weight`; schema `max_total_value`/`max_total_weight_grams` | None | Name/scope mismatch makes both writers broken. |
| Delivery ownership | UI/service assume location zones; schema requires organization zones; delivery config is organization scoped | Schema is current persistence contract | Scope split breaks zone writes and misleads config UI. |
| Pricing tiers | `pricing_tiers.multiplier`; product `pricing_tier_id`; price fields/overrides | Product/base and location prices; multiplier never applied | Tier identity/active are live; multiplier PARTIAL. |
| Discount recurrence | Builder recurrence fields; loader recurrence object | Loader hardcodes disabled | Writer exists, behavior is fixed off. |

## Cross-surface write, cache, and propagation findings

1. **Surface A can clobber every JSON sub-writer.** It loads a location snapshot and later sends the entire object. Its API does a nontransactional shallow merge/upsert. A stale A tab can overwrite B, Receipts, Register Configure, Customer Fields, Product Fields, Package Formats, or Marketing Configure changes.
2. **Surface B silently loses edits before the network.** All 13 controls share one timer; a second edit within 500 ms cancels the first control's pending PUT. The UI ignores the eventual response, and the service ignores Supabase read/update/insert errors.
3. **Nested sub-surfaces repeat the clobber pattern.** Receipts send a whole `receipt` snapshot; Cards send a whole `customer_card_fields` object; several APIs read/merge/upsert without a version check or transaction.
4. **Entity create scope is repeatedly absent.** Rooms, registers, fees, and taxes omit required `location_id`. Delivery zones omit required ownership and disagree with schema scope.
5. **Delivery config writes invalid columns and hides the failure.** Both update/insert results are ignored, then the API returns success. GET filters a nonexistent `is_active` column and also ignores the result error.
6. **Tax edits can be stale for five minutes.** `taxRateLoader.ts:11,17-20` caches; `clearTaxRateCache` is exported but no mutation calls it.
7. **BioTrack has two caches and split clients.** Config PATCH clears the five-minute loader cache, not the ten-minute location-client cache. Sale sync uses an environment client; manifest sync reads table credentials.
8. **Dutchie loyalty is a nontransactional dual write.** A second-store failure can leave location `dutchie_config` and organization `dutchie_sync_state` inconsistent.
9. **The service worker can serve stale GET data.** `public/sw.js:19-60` caches successful `/api/*` GET responses and has no settings-write invalidation. A failed network can therefore restore an older config response.
10. **Printer nullable fields are not nullable end to end.** UI emits null/blank for IP, port, and account email; validation rejects those representations, so defaults/clears fail.
11. **Several “encrypted” columns are not encrypted here.** BioTrack, Dutchie, and print-service APIs store submitted secrets directly under `_encrypted` names; BioTrack GET returns stored credentials to the browser.
12. **Discount cache invalidation is absent.** Active discount rows are cached, but builder/list mutations do not clear the loader, delaying or preventing expected checkout changes until expiry/reload.

## Why two location-settings surfaces exist

**Facts from history:** Surface B's page was introduced by commit `6f34be0a360e309461b739a47ca1ad97a8f88538` on 2026-03-30. Surface A and `LOCATION-SETTINGS-KEYS.md` were introduced by `ce398f4b441345ca69073945906f476b66fef8d2` on 2026-04-01. Both persist into the same location JSONB row but use different pages, APIs, key names, save mechanics, and default behavior. Later UI changes touched the files but did not establish a canonical source.

**Inference, not a commit-stated motive:** the two pages appear to be adjacent independent implementations rather than an intentional default/override architecture. There is no shared typed schema, precedence rule, migration, or navigation explanation that would make the duplication deliberate.

## Consolidation recommendation

Kane's preference for one global settings surface is directionally right as a **single settings hub**, but a single global blob would be unsound. The code has legitimate organization, location, register, and device/browser scopes. The closest sound design is one hub with an explicit scope selector, organization defaults, per-location overrides, and separate register/device sections.

### Target scope model

| Scope | Belongs here | Why |
|---|---|---|
| Organization | Delivery policy, discount/loyalty policy, product taxonomy, labels/templates, marketing, default configuration | Shared business policy and catalogs. |
| Location | Checkout/compliance overrides, tax rates, BioTrack/Dutchie connection, online-order availability, receipts, product-form configuration | Behavior differs by licensed store/location. |
| Register | Auto-print override, assigned printers, drawer/register workflow | Hardware/workstation-specific behavior. |
| Device/browser | Theme and any local hardware bridge selection | Current theme persistence is local and should not masquerade as global. |

### Concrete migration map

| Existing page/store/key | Canonical target | Migration/action |
|---|---|---|
| **Kill** `/settings/locations/[id]/settings` (Surface B) | `/settings/location-settings` rebuilt as the location section of the hub | Backfill/rename the rows below, change location-list link to the hub with `location_id`, then delete B page/API. |
| A `require_customer_checkout`; B `require_customer` | `checkout.require_customer` | Coalesce with explicit precedence during migration; then wire terminal/API validation. |
| A `require_id_scan`; B `require_id_verification` | `compliance.require_id_scan` | Coalesce, define customer/age exceptions, and wire checkout gate. |
| A/B `auto_deduct_on_sale` | No setting if deduction is invariant; otherwise `inventory.deduct_on_sale` | Prefer deleting the control because current transaction correctness requires deduction. |
| A `auto_print_receipt`; B `print_receipt_auto`; `registers.auto_print_receipts` | Location default `printing.auto_print_receipt_default` + nullable `registers.auto_print_receipts_override` | Backfill register override, then delete both JSON aliases. |
| A `auto_print_label`; generated register field | `printing.auto_print_label_default` + register override | Same precedence model; add actual print-job consumer before exposing. |
| A `auto_sync_biotrack`; B `biotrack_auto_sync` | `biotrack_config.is_enabled` | Backfill one table flag, delete JSON aliases, and make sale/manifest/retry paths honor it. |
| B `enable_online_ordering`; `locations.allows_online_orders` | `locations.allows_online_orders` | Backfill the typed location column; gate orders API/storefront; delete JSON key. |
| B `enable_reservations` | Typed `online_order_config.reserve_inventory` at location scope | Create one store and make order service branch on it. |
| B `enforce_purchase_limits` | `purchase_limits` policy; enforcement always on | Delete misleading toggle. If optional enforcement is legally allowed, add a typed policy flag to that table, not JSON. |
| B `low_stock_threshold`; hardcoded 5 | Typed location/product threshold with documented precedence | Backfill 5, remove hardcode, delete JSON key. |
| Nested `settings.receipt.*`; unused `receipt_config` | `receipt_config` per location | Map location fields to `header_config`, product/tax/discount fields to `line_item_config`, and policy/loyalty/BioTrack fields to `footer_config`/`additional_config`; update terminal renderer; then delete nested JSON. |
| Registry `guestlist_*`; UI aliases; `guestlist_statuses` | Status table for defaults; typed workflow-mapping table for event mappings | Migrate any non-null UI aliases, delete all 20 JSON names, and make queue/order transitions read the typed mapping table. |
| `delivery_config` UI names | Schema names `max_total_value`, `max_total_weight_grams`; organization scope | Rename UI/API payload, remove nonexistent `is_active`, and move section under Organization. |
| Delivery zones location assumption | Choose schema-consistent organization scope or add real `location_id` | Given current schema, make organization ownership explicit and optionally add a location join/override table. |
| `product_field_config`, `package_id_formats` missing registry | Typed versioned location-settings schema | Add both to the schema/registry; keep product fields, but do not expose formats until actual receive/generation code consumes them. |
| Surface A flat JSON, Register/Customer JSON sub-writers | Versioned key-level PATCH/RPC | Replace read/merge/upsert with schema-validated atomic patches, optimistic version/ETag, and propagated errors. |
| Environment and table BioTrack credentials | Encrypted location secret store, referenced by one client factory | Migrate credentials once; remove environment/table split and raw browser reads. |

Implementation should preserve a short compatibility reader during backfill, then remove aliases. Do not keep indefinite “read old or new” fallback: that recreates the source-of-truth problem.

## Evidence appendix

### Revision and porcelain evidence

`git rev-parse HEAD` returned `9c74c5845a7b4fe9520b0259a074850f1aa31b51`; `git branch --show-current` returned `route/settings-wiring-audit`.

Recorded `.route/porcelain-baseline.txt`:

```text
 M .route/devserver.log
?? .route/porcelain-baseline.txt
```

Live pre-run `git status --porcelain`, captured before this audit file existed:

```text
 M .route/devserver.log
?? .route/build-audit.txt
?? .route/porcelain-baseline.txt
```

The live workspace already had untracked `.route/build-audit.txt`, which is absent from the recorded baseline. This audit did not create, edit, or delete it. Therefore literal AC-7 comparison to the recorded file begins with a pre-existing one-file discrepancy; the final gate distinguishes that environment drift from the audit's changes.

Final `git status --porcelain`:

```text
 M .route/devserver.log
?? .route/build-audit.txt
?? .route/porcelain-baseline.txt
?? SETTINGS-WIRING-AUDIT.md
```

This equals the live pre-run snapshot plus exactly `SETTINGS-WIRING-AUDIT.md`. It does not equal the recorded baseline plus the audit because the pre-existing `.route/build-audit.txt` discrepancy remains untouched.

### Search-command ledger

All commands below were run from the repository root. Counts are line-match counts. A zero is intentionally recorded. Settings UI/API/type/test exclusions prevent a writer, declaration, or generated type from being mistaken for a behavioral consumer.

#### Inventory, registry, indirection, and history

```text
git grep -n -E "href: '/(settings|registers/configure|customers/configure|customers/referrals|products/configure|marketing)" -- src/components/backoffice/Sidebar.tsx
result: 30

git grep -n -E '^\| `[a-z_]+(\.[a-z_]+)?` \|' -- LOCATION-SETTINGS-KEYS.md
result: 89

git grep -n -e "getLocationSettings" -e "updateLocationSettings" -e "location_settings" -- src supabase public
result: 24

git grep -n -F -- 'getLocationSettings' -- src
result: 3; service definition plus B API import/call only

git grep -n -F -- 'location_settings' -- 'src/app/(terminal)' src/app/api/terminal src/components/terminal src/hooks src/lib/calculations
result: 0

git grep -n -e 'locationSettings' -e 'location_settings' -- src/hooks src/stores src/app/api/auth src/components/terminal 'src/app/(terminal)' ':(exclude)**/__tests__/**'
result: 0; session/bootstrap/Zustand/terminal paths carry no location-settings object

git log --follow --format="%H|%ad|%s" --date=short -- "src/app/(backoffice)/settings/locations/[id]/settings/page.tsx"
result: 2 commits; introduction `6f34be0a360e309461b739a47ca1ad97a8f88538|2026-03-30`

git log --follow --format="%H|%ad|%s" --date=short -- "src/app/(backoffice)/settings/location-settings/page.tsx"
result: 3 commits; introduction `ce398f4b441345ca69073945906f476b66fef8d2|2026-04-01`

git log --follow --format="%H|%ad|%s" --date=short -- LOCATION-SETTINGS-KEYS.md
result: 1 commit; `ce398f4b441345ca69073945906f476b66fef8d2|2026-04-01`
```

An initial broad search was also logged honestly:

```text
git grep -n -e "api/settings/location-settings" -e "api/locations/.*/settings" -e "getLocationSettings" -e "updateLocationSettings" -e "location_settings" -- ':!*.md' ':!package-lock.json'
result: timed out after 20 seconds because tracked `.route` build logs matched heavily; no complete count; replaced by the source-scoped 24-match command above
```

#### Surface A and B exact-key negatives (`NEG-A/B`)

The following exact command was run once for each literal listed below:

```text
git grep -n -F -- '<literal-key>' -- src public supabase ':(exclude)src/app/(backoffice)/settings/location-settings/page.tsx' ':(exclude)src/app/(backoffice)/settings/locations/[id]/settings/page.tsx' ':(exclude)src/lib/services/__tests__/**' ':(exclude)src/types/database.ts'
```

Literals: `rounding_method`, `require_customer_checkout`, `show_customer_dob_checkout`, `require_id_scan`, `show_product_notes`, `auto_close_drawer`, `allow_partial_payments`, `enable_tips`, `show_loyalty_in_pos`, `require_manager_discount_approval`, `allow_price_overrides`, `show_cost_in_pos`, `enable_product_bundles`, `quick_add_customer`, `show_allotment_warning`, `auto_print_receipt`, `auto_print_label`, `show_cost_on_reports`, `enable_audit_trail`, `allow_bulk_operations`, `enable_export`, `show_margin_on_reports`, `enable_scheduled_reports`, `auto_deduct_on_sale`, `enable_batch_tracking`, `enable_lot_tracking`, `show_testing_status`, `require_lab_before_sale`, `enable_quarantine_workflow`, `auto_sync_biotrack`, `show_flower_equivalent`, `enable_inventory_alerts`, `sync_weedmaps`, `sync_leafly`, `sync_springbig`, `sync_headset`, `enable_mobile_pos`, `require_wifi`, `allow_offline_mode`, `auto_sync_reconnect`, `show_original_price_discounted`, `apply_loyalty_before_tax`, `apply_discounts_before_tax`, `enable_price_scheduling`, `password_min_length`, `password_expiration_days`, `require_customer`, `auto_apply_discounts`, `allow_zero_price`, `print_receipt_auto`, `low_stock_threshold`, `enable_reservations`, `enforce_purchase_limits`, `require_id_verification`, `biotrack_auto_sync`, `enable_online_ordering`, `pickup_window_minutes`, `max_advance_order_days`.

Result: 0 behavioral matches for all 58 literals. The substring `auto_print_receipt` initially found plural writer/type occurrences, so `NEG-A/B-exact` used:

```text
git grep -n -F -- "'auto_print_receipt'" -- src public supabase ':(exclude)src/app/(backoffice)/settings/location-settings/page.tsx' ':(exclude)src/app/(backoffice)/settings/locations/[id]/settings/page.tsx' ':(exclude)src/lib/services/__tests__/**' ':(exclude)src/types/database.ts'
result: 0
```

Alternative-authority searches:

```text
git grep -n -F -- 'discount_type' -- src/lib/calculations
result: 7

git grep -n -F -- 'purchase_limits' -- src/lib/calculations src/lib/services/transactionService.ts src/app/api/cart/config/route.ts
result: 1

git grep -n -F -- 'allows_online_orders' -- src
result: 3; generated database types only

git grep -n -F -- 'auto_print_receipts' -- src
result: 5; writer/service/generated type only

git grep -n -F -- 'quantity = quantity -' -- supabase/migrations
result: 1

git grep -n -F -- '<= 5' -- src/lib/services/advancedReportingService.ts
result: 1
```

#### Registry-only negatives (`NEG-R`)

Each literal below was substituted into this exact command:

```text
git grep -n -F -- '<registry-literal>' -- src public supabase
```

`manager_discount_threshold`, `show_weight_in_pos`, `enable_pre_orders`, `guestlist_default_status_id`, `guestlist_preorder_notify_status_id`, `guestlist_online_pickup_status_id`, `guestlist_online_delivery_status_id`, `guestlist_instore_order_status_id`, `guestlist_curbside_status_id`, `guestlist_drive_thru_status_id`, `guestlist_skipped_delivery_status_id`, `guestlist_ready_delivery_status_id`, `guestlist_start_route_status_id`, `cfd_enabled`, `cfd_wallpaper_url`.

Result: 0 for each of the 15 exact literals.

#### Nested receipt parent and leaves (`NEG-RECEIPT`)

```text
git grep -n -F -- 'receipt' -- src public supabase
result: 72

git grep -n -e 'show_location_name' -e 'show_location_address' -e 'show_location_phone' -e 'show_license_number' -e 'show_employee_name' -e 'show_customer_name' -e 'show_sku' -e 'show_thc_percentage' -e 'show_tax_breakdown' -e 'show_discount_details' -e 'show_loyalty_points' -e 'show_return_policy' -e 'show_biotrack_id' -- 'src/**' ':(exclude)src/app/(backoffice)/settings/receipts/page.tsx' ':(exclude)src/app/(backoffice)/settings/location-settings/page.tsx' ':(exclude)src/app/api/locations/[id]/settings/route.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0

git grep -n -F -- 'receipt_config' -- src ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0
```

Raw leaf counts before exclusions: `show_sku` 5; `show_thc_percentage` 3; `show_discount_details` 1; each other leaf 2. Every hit was the settings preview/writer, a test, or a type—not the terminal renderer.

#### Other settings surfaces

```text
git grep -n -F -- 'use_other_plant_material' -- 'src/**' ':(exclude)src/app/(backoffice)/settings/biotrack/page.tsx' ':(exclude)src/app/api/settings/biotrack-config/route.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 1; `configLoader.ts:17` interface declaration only (`NEG-BIOTRACK`)

git grep -n -F -- 'getBioTrackClientForLocation' -- 'src/**' ':(exclude)**/__tests__/**'
result: 3; deprecation comment, definition, barrel export; no caller

git grep -n -e 'BIOTRACK_V3_URL' -e 'BIOTRACK_USERNAME' -e 'BIOTRACK_PASSWORD' -e 'BIOTRACK_LICENSE_NUMBER' -- 'src/**' ':(exclude)**/__tests__/**'
result: 13

git grep -n -e 'sync_employees' -e 'sync_customers' -e 'sync_products' -e 'sync_inventory' -e 'sync_rooms' -e 'sync_transactions' -e 'designated_location_id' -e 'api_key_encrypted' -- 'src/lib/dutchie/**' 'src/app/api/dutchie/**' ':(exclude)**/__tests__/**'
result: 16

git grep -n -e 'max_delivery_value' -e 'max_delivery_weight' -- src ':(exclude)src/app/(backoffice)/settings/delivery/page.tsx' ':(exclude)src/app/api/delivery/config/route.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-DELIVERY`); generated schema uses different names

git grep -n -F -- 'fees_donations' -- src ':(exclude)src/app/(backoffice)/settings/fees/page.tsx' ':(exclude)src/app/api/fees-donations/**' ':(exclude)src/lib/services/settingsService.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-FEES`)

git grep -n -F -- 'label_type' -- 'src/lib/**' 'src/components/terminal/**' 'src/app/(terminal)/**' 'src/app/(storefront)/**' ':(exclude)src/lib/services/labelService.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-LABEL-TYPE`)

git grep -n -e 'printer_type' -e 'computer_name' -e 'supports_labels' -e 'supports_receipts' -e 'connection_type' -e 'ip_address' -e 'print_service_config' -- src ':(exclude)src/app/(backoffice)/settings/printers/page.tsx' ':(exclude)src/app/api/settings/printers/**' ':(exclude)src/app/api/settings/print-service/route.ts' ':(exclude)src/types/**' ':(exclude)src/lib/auth/ownership.ts' ':(exclude)**/__tests__/**'
result: 0 (`NEG-PRINTER`)

git grep -n -e 'service_type' -e 'account_email' -e 'api_key_encrypted' -- src ':(exclude)src/app/(backoffice)/settings/printers/page.tsx' ':(exclude)src/app/api/settings/print-service/route.ts' ':(exclude)src/app/api/settings/dutchie-config/**' ':(exclude)src/lib/dutchie/**' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-PRINT-SVC`)

git grep -n -F -- 'auto_print_receipts' -- src ':(exclude)src/app/(backoffice)/settings/registers/page.tsx' ':(exclude)src/app/api/registers/**' ':(exclude)src/lib/services/settingsService.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-AUTOPRINT`)

git grep -n -e 'caches.' -e "startsWith('/api/')" -e 'cache.put' -- public/sw.js
result: 10

git grep -n -e 'clearTaxRateCache' -e 'CACHE_TTL' -- src/lib/calculations/taxRateLoader.ts 'src/app/api/tax-rates/**' src/lib/services/settingsService.ts
result: 1; declaration/export only, no mutation caller
```

#### Register configure negatives

```text
git grep -n -e 'preorder_notify_status_id' -e 'online_pickup_status_id' -e 'online_delivery_status_id' -e 'in_store_order_status_id' -e 'curbside_status_id' -e 'drive_thru_status_id' -e 'skipped_delivery_status_id' -e 'ready_for_delivery_status_id' -e 'start_delivery_route_status_id' -- src public supabase ':(exclude)src/app/(backoffice)/registers/configure/guestlist/page.tsx' ':(exclude)src/app/api/registers/configure/settings/route.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-GUESTLIST`)

git grep -n -F -- 'color' -- src/app/api/terminal/queue/route.ts
result: 3; selected into API payload only; no color behavioral branch in `CustomerQueue.tsx`

git grep -n -e 'enabled_order_types' -e 'workflow_type' -e 'default_order_source' -- src public supabase ':(exclude)src/app/(backoffice)/registers/configure/workflow/page.tsx' ':(exclude)src/app/api/registers/configure/settings/route.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-WORKFLOW`)

git grep -n -F -- "'order_sources'" -- src ':(exclude)src/app/(backoffice)/registers/configure/**' ':(exclude)src/app/api/registers/configure/order-sources/**' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-WORKFLOW` identity/lifecycle)

git grep -n -F -- 'customer_card_fields' -- src public supabase ':(exclude)src/app/(backoffice)/registers/configure/cards/page.tsx' ':(exclude)src/app/api/registers/configure/settings/route.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-CARDS` parent)

git grep -n -F -- 'transaction_reasons' -- src ':(exclude)src/app/(backoffice)/registers/configure/**' ':(exclude)src/app/api/registers/configure/transaction-reasons/**' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 1; ownership metadata only, no behavioral consumer (`NEG-REASONS`)

git grep -n -e 'restrict_transaction_hours' -e 'transaction_hours_start' -e 'transaction_hours_end' -- src public supabase ':(exclude)src/app/(backoffice)/registers/configure/settings/page.tsx' ':(exclude)src/app/api/registers/configure/settings/route.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-REGISTER-HOURS`)
```

The 27 card leaf literals were also read from `CARD_FIELDS` and searched separately while tracing related uses. Generic leaves such as `address`, `state`, and `register` have many unrelated domain hits; none occurs under a `customer_card_fields` loader or branch. The zero parent-key search is the decisive negative evidence.

#### Customer configure negatives

```text
git grep -n -F -- 'customer_field_visibility' -- src public supabase ':(exclude)src/app/(backoffice)/customers/configure/fields/page.tsx' ':(exclude)src/app/api/customers/configure/fields/route.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-CUSTOMER-FIELDS` parent)

git grep -n -e "'doctors'" -e "'qualifying_conditions'" -- src ':(exclude)src/app/(backoffice)/customers/configure/**' ':(exclude)src/app/api/customers/configure/**' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-CUSTOMER-REF`)

git grep -n -e 'assignment_method' -e 'show_in_register' -- src ':(exclude)src/app/(backoffice)/customers/configure/badges/page.tsx' ':(exclude)src/app/api/badges/**' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 2; one TypeScript interface declaration and one nested API select; no use branch (`NEG-BADGE`)
```

The 51 field leaf names were searched while inspecting terminal/customer forms. Many generic names have unrelated customer-column uses, but none is connected to the zero-hit `customer_field_visibility` parent, loader, or branch.

#### Product configure negatives and positive field chain

```text
git grep -n -F -- 'parent_id' -- 'src/app/(terminal)' 'src/app/(storefront)' src/components/terminal src/lib/services src/lib/calculations ':(exclude)**/__tests__/**'
result: 0 (`NEG-CATEGORIES`)

git grep -n -e "'inventory_statuses'" -e "'adjustment_reasons'" -- src ':(exclude)src/app/(backoffice)/products/configure/**' ':(exclude)src/app/api/settings/inventory-statuses/**' ':(exclude)src/app/api/settings/adjustment-reasons/**' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-PRODUCT-REF`)

git grep -n -F -- 'dosage_presets' -- src ':(exclude)src/app/(backoffice)/products/configure/**' ':(exclude)src/app/api/settings/dosages/**' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-DOSAGE` parent); raw `thc_mg`/`cbd_mg` hits are product potency fields, not dosage preset reads

git grep -n -e 'product_kits' -e 'product_kit_items' -- src ':(exclude)src/app/(backoffice)/products/configure/**' ':(exclude)src/app/api/product-kits/**' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-KIT`)

git grep -n -F -- 'package_id_formats' -- src public supabase ':(exclude)src/app/(backoffice)/products/configure/**' ':(exclude)src/lib/services/packageFormatService.ts' ':(exclude)src/app/api/settings/package-formats/**' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-FORMAT`)

git grep -n -e 'product_field_config' -e 'fieldVisible(' -e 'fieldRequired(' -- src/components/backoffice/ProductForm.tsx src/lib/services/productFieldConfigService.ts 'src/app/api/settings/product-field-config/**'
result: 80; writer/loader and per-field behavior (`PRODUCT-FIELD-POS`)
```

#### Marketing negatives and discount positives

```text
git grep -n -e 'initial_signup_reward' -e 'enrollment_type' -e 'redemption_method' -e 'point_expiration_days' -e 'tiers_enabled' -- src ':(exclude)src/app/(backoffice)/marketing/loyalty/page.tsx' ':(exclude)src/app/api/loyalty/**' ':(exclude)src/lib/services/loyaltyConfigService.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-LOYALTY`)

git grep -n -e 'default_store_url' -e 'marketing_tags' -- src public supabase ':(exclude)src/app/(backoffice)/marketing/configure/page.tsx' ':(exclude)src/app/api/marketing-tags/**' ':(exclude)src/app/api/registers/configure/settings/route.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-MARKETING-CONFIG`)

git grep -n -e 'coupon_code' -e 'discount_code' -- 'src/app/(terminal)' 'src/app/(storefront)' src/components/terminal src/lib/calculations src/lib/services/transactionService.ts ':(exclude)**/__tests__/**'
result: 0 (`NEG-COUPON`)

git grep -n -F -- "from('events')" -- src ':(exclude)src/app/(backoffice)/marketing/**' ':(exclude)src/app/api/events/**' ':(exclude)src/lib/services/eventService.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-EVENT`)

git grep -n -F -- "from('campaign_templates')" -- src ':(exclude)src/app/(backoffice)/marketing/**' ':(exclude)src/app/api/templates/**' ':(exclude)src/lib/services/templateService.ts' ':(exclude)src/types/**' ':(exclude)**/__tests__/**'
result: 0 (`NEG-TEMPLATE`)

git grep -n -e 'loadDiscountsForOrganization' -e 'evaluateDiscounts' -e 'clearDiscount' -- src/lib/calculations src/lib/services/transactionService.ts src/app/api/transactions/route.ts ':(exclude)**/__tests__/**'
result: 6; load/evaluate chain present, no cache-clear mutation call
```

#### Additional positive reachability searches

```text
git grep -n -e 'data-theme' -e 'ThemeProvider' -e 'themeBootstrapScript' -- src/app src/components/theme src/lib/theme
result: 12

git grep -n -e 'fetchPendingManifests' -e 'acceptManifestTransfer' -e 'syncSaleToBioTrack' -e 'syncVoidToBioTrack' -e 'syncRefundToBioTrack' -- 'src/**' ':(exclude)**/__tests__/**'
result: 13

git grep -n -e '/api/labels/generate' -e '/api/labels/templates' -e 'template_id' -e 'width_mm' -e 'height_mm' -- src ':(exclude)src/app/(backoffice)/settings/labels/page.tsx' ':(exclude)src/app/api/labels/**' ':(exclude)src/lib/services/labelService.ts' ':(exclude)**/__tests__/**'
result: 34

git grep -n '/api/rooms' -- 'src/**' ':(exclude)src/app/(backoffice)/settings/rooms/page.tsx' ':(exclude)src/app/api/rooms/**' ':(exclude)**/__tests__/**'
result: 10

git grep -n -e 'loadTaxRatesForLocation' -e 'calculateTaxes' -e 'clearTaxRateCache' -- 'src/**' ':(exclude)**/__tests__/**'
result: 13; clear hits are declaration/export, not a mutation call

git grep -n 'redirect(' -- 'src/app/(backoffice)/settings/dosages/page.tsx' 'src/app/(backoffice)/settings/inventory-statuses/page.tsx' 'src/app/(backoffice)/settings/package-formats/page.tsx' 'src/app/(backoffice)/settings/product-fields/page.tsx'
result: 4
```

### Deterministic stratified spot-check definition

For sorting, “control key” means the persisted/code key with presentation prefixes removed; `is_active` is used for lifecycle controls. Ties use Surface ascending. For each required stratum, rows are sorted by that normalized key and the first two are selected. The other-surface stratum includes every row whose writer surface is neither A, B, nor Registry only; overlap with a verdict stratum is retained because the plan defines strata independently.

| Stratum | First two rows selected | Independent verification target |
|---|---|---|
| WIRED | Dutchie `apiKey`; Discounts `customer_types` | Client/cron or manifest behavioral branch and production entry. |
| PLACEHOLDER | A `allow_offline_mode`; A `allow_partial_payments` | Exact-key negative plus unconditional/alternate behavior. |
| DRIFT | B `auto_apply_discounts`; A `auto_sync_biotrack` | Unread writer key plus equivalent consumed store. |
| PARTIAL | Loyalty `accrual_rate`; Discounts `application_method` | Existing chain and precisely missing/scope-broken link. |
| Other-surface | Print service `account_email`; Loyalty `accrual_rate` | Control-specific writer failure; scope-broken consumer chain. |
| Registry-only | `cfd_enabled`; `cfd_wallpaper_url` | Registry presence and source count zero. |

Target: 12 stratum entries, 11 unique rows (the independently defined Other-surface stratum repeats `accrual_rate`). Final verification result is recorded below.

### Acceptance and gates

| Criterion / gate | Result |
|---|---|
| AC-1 | PASS in manifest: A 46; B 13; registry-only 15; audited SHA stated. |
| AC-2 | PASS in concept matrix: duplicate names/stores and actual authorities mapped. |
| AC-3 | PASS in manifest: all inventory surfaces and mutable entity fields represented; total 549 rows. |
| AC-4 | PASS: all 69 WIRED rows cite a behavioral branch file:line; PLACEHOLDER rows map to exact negative-ledger commands; the deterministic sample was independently checked against code. |
| AC-5 | PASS: every A/B row has Writer OK and Default mismatch. |
| AC-6 | PASS: history, clobber/error findings, scope-aware consolidation, and key migration map included. |
| AC-7 / scope gate | Audit delta PASS: final live status equals live pre-run plus exactly this file. Literal recorded-baseline comparison is blocked by pre-existing untracked `.route/build-audit.txt`, disclosed above and left untouched. |
| `npm run typecheck` | PASS: `tsc --noEmit`, exit 0. |
| Deterministic independent spot-check | PASS: 12 stratum entries / 11 unique rows verified; the first review exposed BioTrack and category scope breaks, which were corrected before the final sample and count re-check. |
