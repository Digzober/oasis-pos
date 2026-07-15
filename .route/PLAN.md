# PLAN: Settings consolidation + full wiring fix

Branch: `route/settings-fix` (from route/settings-wiring-audit `8117d4c`).
Class: HIGH-RISK (schema/migrations, money, tax, BioTrack compliance, auth surface).
Plan review: WAIVED by Kane ("adversarial reviews are done, go straight to building") — the spec is the approved SETTINGS-WIRING-AUDIT.md (consolidation recommendation + concrete migration map + 12 cross-surface findings), which was itself produced under two adversarial review rounds. Recorded in LOG.md.
Iteration budget: build↔gate ≤3 per phase, review↔fix ≤3, hard cap 8 total.

## Goal
Implement the audit's consolidation recommendation and migration map in full: one settings hub (org defaults + per-location overrides), Surface B killed, canonical keys migrated, every keeper setting actually wired to a behavioral branch, all 12 cross-surface findings fixed, placeholder controls that have no consumer surface removed.

## Non-negotiable constraints
- READ `DATABASE-CONSTRAINTS.md` (repo root, and parent OCC-POS copy if referenced) BEFORE any insert/update code or migration. Never invent enum values; ALTER constraints via migration first if a new value is required.
- Compliance direction is fail-safe: purchase-limit enforcement stays ALWAYS ON (delete the toggle); BioTrack sync defaults ON and is skipped only when `biotrack_config.is_enabled` is explicitly false.
- Supabase patterns from repo conventions: for new tables, extend `src/types/database.ts` manually in the established style (no network type-regen available); use upsert patterns consistent with existing services.
- New migrations go in `supabase/migrations/` with timestamped names; they must be idempotent-safe and include backfill statements for key migrations. Do NOT attempt to apply them to a remote DB.
- TypeScript strict; no new `any` without justification; functions ≤50 lines; follow Forbidden Patterns in CLAUDE.md.
- Tests: extend existing Vitest suites for every newly wired behavioral branch (calculations/services level). 301 existing tests must keep passing.

## Phase A — P0 correctness bugs + settings core + consolidation
1. **Loyalty cross-org bug**: `transactionService.ts:229-241` — add `.eq('organization_id', organizationId)` to the `loyalty_config` accrual query.
2. **Tax cache invalidation**: every tax mutation route calls `clearTaxRateCache()`.
3. **Discount cache invalidation**: discount builder/list mutations clear the discount loader cache.
4. **Discount loader fidelity**: honor full `customer_types` array (not `[0]`); honor `weekly_recurrence` (stop hardcoding `is_recurring: false`); load the constraint/reward filter types the loader currently drops; fix the 16 BROKEN-WRITE discount-builder controls (audit §registers/discount rows) so every builder field persists and round-trips.
5. **Settings core module** `src/lib/settings/`:
   - Zod schema = single source of truth for canonical keys (namespaced: `checkout.*`, `compliance.*`, `printing.*`, `inventory.*`, `online.*`, `receipt.*`), types + defaults exported.
   - New migration: `organization_settings` table (organization_id UNIQUE FK, settings JSONB, updated_at trigger, RLS as per existing tables).
   - `getEffectiveSettings(locationId)`: location override > org default > code default; server-side, cached ≤60s with mutation invalidation.
   - **Key-level atomic writes**: new RPC migration (`jsonb deep-merge of validated patch`) or column-guarded update — eliminates read-merge-upsert clobber (audit finding 1). All JSON sub-writers (location-settings, receipts, register configure, customer fields, product fields, marketing configure) switch to it. Reject unknown keys.
6. **Key migration** (one data migration): coalesce per audit map with explicit precedence (location value wins over stale alias; document in migration comments): `require_customer_checkout`+`require_customer` → `checkout.require_customer`; `require_id_scan`+`require_id_verification` → `compliance.require_id_scan`; `auto_print_receipt`+`print_receipt_auto` → `printing.auto_print_receipt_default`; `auto_print_label` → `printing.auto_print_label_default`; `auto_sync_biotrack`+`biotrack_auto_sync` → backfill `biotrack_config.is_enabled`; `enable_online_ordering` → backfill `locations.allows_online_orders`; `enable_reservations` → `online.reserve_inventory`; `low_stock_threshold` → `inventory.low_stock_threshold`; delete from JSON: the coalesced aliases plus dropped controls (`enforce_purchase_limits`, `auto_deduct_on_sale`, integrations `sync_*`, mobile checkout group, security group, admin group, pricing group toggles that have no consumer and no keeper mapping).
7. **Hub UI**: rebuild `/settings/location-settings` as the settings hub — scope selector (Organization defaults | per-location override with location picker honoring employee_locations), sections ONLY for keeper settings (each rendered control must be consumed by runtime after Phase B). Per-control override indicator (inherits vs overridden). Follow existing dark-theme component patterns.
8. **Kill Surface B**: delete `/settings/locations/[id]/settings` page; `/api/locations/[id]/settings` returns 410 or is removed with references cleaned; Locations list links to the hub with the location preselected. `settingsService.updateLocationSettings` either deleted or rewritten on the atomic patch path with error propagation (no swallowed Supabase errors anywhere in it).
9. Regenerate `LOCATION-SETTINGS-KEYS.md` from the Zod schema (script or hand-sync) — registry must match code exactly, including `product_field_config` and `package_id_formats`.

## Phase B — wire every keeper setting to a behavioral branch
1. `checkout.require_customer`: terminal checkout blocks (UI) AND transaction API rejects `customer_id: null` when effective setting true.
2. `compliance.require_id_scan`: terminal requires ID verification step before checkout when true (gate at checkout start; API-side validation that customer has verified ID when true).
3. `printing.auto_print_receipt_default` + nullable `registers.auto_print_receipts` override (migration alters column nullable if needed): post-sale receipt print call honors register override else location default. Same model for `auto_print_label_default` + `registers.auto_print_labels`, wired into the existing label print flow.
4. **BioTrack**: `saleSync`, void/return sync, and retry queue honor `biotrack_config.is_enabled` (default true when row missing). Manifest paths keep their existing credential source. Config PATCH clears BOTH the 5-min loader cache and the 10-min client cache (audit finding 7).
5. **Online ordering**: orders API + storefront menu gate on `locations.allows_online_orders`; `onlineOrderService` reserves inventory only when `online.reserve_inventory` true; `online.pickup_window_minutes` and `online.max_advance_order_days` validated at order creation.
6. **Low stock**: replace hardcoded `5` in the advanced/low-stock report with precedence: per-product/location threshold field > `inventory.low_stock_threshold` > 5.
7. **Receipts**: terminal receipt renderer reads `receipt_config` (per location). Data migration maps nested `settings.receipt.*` → `receipt_config` columns per audit map (header/line_item/footer/additional), then deletes the nested JSON. Receipts settings page writes `receipt_config` via key-level updates. Preview and production render from the same config reader.
8. **Rounding**: implement `checkout.rounding_method` in the totals calculation (the 11 documented methods; cash-total rounding, applied once, itemized on receipt as rounding adjustment) OR — if terminal totals flow makes this unsafe within budget — drop the control entirely and remove from schema. Prefer implementing; it is Tier-2 money with an existing calculations module and test suite.

## Phase C — remaining findings + placeholder disposition
1. **Guestlist mappings**: new typed table `guestlist_workflow_mappings` (location_id, workflow_event TEXT CHECK per the 10 events, status_id FK); migrate non-null UI aliases; register-configure guestlist tab writes it; queue/order status transitions read it; delete the 20 JSON names. Default-status selection stays on `guestlist_statuses.is_default`.
9. (ordering note: keep numbering) 
2. **Customer card fields**: terminal guestlist/customer cards honor `customer_card_fields` per-status visibility JSON (the consumer surface exists — wire it, don't delete). Cards writer switches to key-level patch.
3. **Customer field visibility**: POS/backend/prescription visibility consumed by customer form surfaces (wire `customer_field_visibility` where forms exist).
4. **Entity create scope**: rooms, registers, fees, taxes create APIs require and set `location_id` (session location or explicit param); delivery zones get explicit organization ownership consistent with schema; delivery config UI/API renamed to schema columns (`max_total_value`, `max_total_weight_grams`), bogus `is_active` filter removed, errors propagated, section presented as org-scoped.
5. **Dutchie loyalty dual-write**: sequence writes with error propagation and reconcile-on-failure (org state authoritative; location write failure surfaces an error and does not report success).
6. **Secrets at rest**: AES-256-GCM encrypt BioTrack/Dutchie/print-service credentials server-side using `SETTINGS_SECRET_KEY` env (add to `.env.example`; runtime falls back to plaintext-read for legacy rows and re-encrypts on next save). GET endpoints return masked values only (`••••` + last 4); never send secrets to the browser. Update all consumers (sync engines, clients) to decrypt server-side.
7. **Service worker**: `/api/*` GETs network-first (cache only as offline fallback); settings mutations trigger cache invalidation message. Offline transaction queue behavior unchanged.
8. **Printer nullable fields**: UI and Zod accept null/blank for IP, port, account email symmetrically with DB nullability; clearing a field persists NULL.
9. **Placeholder disposition sweep**: every remaining PLACEHOLDER control from the audit manifest is either (a) wired if its consumer surface already exists and wiring is ≤ small effort, or (b) REMOVED from UI + schema + registry. Nothing decorative survives: after this run, every visible settings control changes behavior. Keep a disposition table in `.route/DISPOSITION.md` (control → wired|removed → evidence/commit).

## Acceptance criteria
- AC-1: Loyalty accrual query filters by organization_id (test proves cross-org isolation).
- AC-2: Tax + discount mutations invalidate their caches (tests).
- AC-3: Discount loader honors full customer_types, weekly recurrence, and previously dropped filters; 16 builder controls round-trip (tests).
- AC-4: `organization_settings` + effective-settings precedence works: org default, location override, code default (tests).
- AC-5: All JSON sub-writers use validated key-level atomic writes; concurrent stale-tab write cannot clobber unrelated keys (test at service level).
- AC-6: Surface B page+API gone; hub is the only writer; Locations list deep-links to hub.
- AC-7: `checkout.require_customer` and `compliance.require_id_scan` block at BOTH terminal UI and API (tests on API path).
- AC-8: BioTrack sale/void/retry honor `biotrack_config.is_enabled`, default ON; both caches cleared on config PATCH (tests).
- AC-9: Online ordering gates + reservation flag + window validations enforced (tests).
- AC-10: Receipt renderer consumes `receipt_config`; nested `receipt.*` JSON migrated and deleted.
- AC-11: Rounding method implemented in totals calc with tests for all 11 methods (or control fully removed with rationale logged — implementation preferred).
- AC-12: Low-stock precedence implemented (test).
- AC-13: Guestlist mapping table live end-to-end; 20 JSON aliases gone.
- AC-14: Customer card fields + field visibility consumed by terminal/customer surfaces.
- AC-15: Entity create scope fixed (rooms/registers/fees/taxes/zones/delivery config) with propagated errors.
- AC-16: Secrets encrypted at rest, masked in responses, no secret reaches the browser (test asserts masking).
- AC-17: sw.js network-first for `/api/*` GETs.
- AC-18: Printer nullables round-trip NULL.
- AC-19: `.route/DISPOSITION.md` lists every audited PLACEHOLDER control as wired or removed; no decorative control remains in any settings UI.
- AC-20: All gates green: typecheck, lint, full test suite (301+ new), build. Registry doc matches Zod schema.

## Out of scope
- Applying migrations to any remote Supabase project (Kane applies via `npx supabase db push`).
- Weedmaps/Leafly/SpringBig/Headset actual integrations (controls are removed, not built).
- Marketing campaign send infrastructure beyond existing code.

## Gates
`.route/gates.txt`: typecheck, lint, test, build. Cheap gates + targeted tests per fix round; FULL suite once before Fable review.
