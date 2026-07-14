# Phase A Audit Ledger

Scope: Phase A only from `.route/PLAN.md` v4 (the committed v4 content retains a stale `PLAN v3` heading). Schema authority for all conformance decisions is `.route/schema-constraints.json`; `DATABASE-CONSTRAINTS.md` is supplementary.

## Findings and fixes

| ID | File:line | Class | Finding | Fix | Fix commit |
|---|---|---|---|---|---|
| S1 | `src/lib/auth/session.ts:79` | security / authorization | The unsigned `oasis-location-id` and `oasis-location-name` cookies replaced the signed session location without organization or employee-assignment validation, allowing cross-location and potentially cross-organization service-role access. | Validate the override against `locations.organization_id`; require an `employee_locations` assignment unless the signed role is admin/owner; derive the name from the database; fail closed to the signed location on missing rows/query errors. Added foreign-org rejection and assigned-manager tests. | `fix(auth): validate location override access` |
| S2 | `src/app/api/dutchie/**/route.ts`; `src/app/api/settings/dutchie-config/**/route.ts` | security / authorization | Dutchie sync, job, configuration, and connection-test endpoints accepted any authenticated role, while service-role reads used a location id alone or no tenant filter. | Added `requireDutchieManager` (manager/admin/owner); applied it to every interactive Dutchie route; joined service-role reads through `locations.organization_id`; validated write targets against the session organization; stripped join-only fields from responses. | Orchestrator checkpoint after A-SEC S2 |
| S3 | `src/lib/dutchie/client.ts:67`; `src/lib/services/customerService.ts:199` | security / PII logging | `logRawResponse` serialized the first Dutchie employee, inventory, or transaction record into logs, exposing names, emails, and transaction/customer data. Customer-search failures also logged the raw name/email/phone/card query. | Removed raw sampling and all call sites; retained only request metadata and aggregate record counts; replaced the raw customer query with its length. Added a regression test proving employee name/email values never reach logger calls. | Orchestrator checkpoint after A-SEC S3 |
| S4 | `src/app/api/settings/dutchie-config/route.ts:18`; `src/app/api/dutchie/locations/route.ts:61`; `src/app/api/settings/print-service/route.ts:9` | security / secret exposure | The Dutchie settings API reused an `apiKey` response property for a masked stored key, legacy location upserts selected/returned the entire row including `api_key`, and print-service GET/PATCH returned `api_key_encrypted` through `select('*')`. | All secret-bearing responses now expose only `hasApiKey` and `apiKeyTail`; both settings UIs keep new-key input separate and omit it when unchanged; legacy Dutchie upsert selects an explicit safe projection. Added a Dutchie response regression test that rejects raw or masked-key-in-`apiKey` leakage. | Orchestrator checkpoint after A-SEC S4 |
| S6 | `src/lib/auth/cron.ts:1`; five existing cron POST routes; `src/app/api/dutchie/cron/route.ts:1` | security / authentication | Cron endpoints treated an unset `CRON_SECRET` as authorization, allowing unauthenticated execution of inventory pulls, retries, order expiration, reconciliation, and scheduled reports. | Added one fail-closed guard: unset/blank secret returns 500, missing/wrong bearer returns 401. Applied it to all five existing cron POST routes. Added the Phase-A-only Dutchie cron boundary (valid auth reaches an explicit 501 until Phase B) and three-case tests. | Orchestrator checkpoint after A-SEC S6 |
| A1-TS | `tsconfig.json`; Phase A typecheck cluster files | baseline / type safety | The measured baseline contained 52 TypeScript errors: stale generated-type assumptions, unsafe indexed access, JSON payload incompatibilities, an ES target below the BioTrack v1 regex requirement, and invalid online-order tenant columns. | Raised the compiler target to ES2020, disabled stale incremental gate caching, corrected types and null guards, cast only schema-authoritative JSON boundaries, aligned guest-list enums/nullability to the live schema, and scoped online orders through their location relation. Standard typecheck now exits 0. | Orchestrator checkpoint after A1 typecheck |
| A1-BIOTRACK | `src/lib/biotrack/client.ts:22`; `src/app/api/settings/biotrack-config/test-connection/route.ts:49`; `src/lib/biotrack/__tests__/biotrack.test.ts:26` | baseline / API contract | The client appended `/v1/login` even though `rest_api_url` is configured as the versioned base (the UI example ends in `/v1`); the stale test expected an unrelated `/auth/login` path. A configured `/v1` URL therefore produced `/v1/v1/login`. | Treat the configured URL as the versioned base, normalize one trailing slash, and append `/login` consistently in the client and connection test. Updated the test fixture/assertion to exercise the actual configured contract. | Orchestrator checkpoint after A1 tests |
| A1-REFERRAL | `src/lib/services/referralService.ts:6` | edge case / data integrity | Referral rewards read a possibly missing loyalty row and wrote `undefined + reward`, producing `NaN`; writes also omitted the organization predicate and journaled a false zero balance. | Added a guarded organization-scoped read and upsert using the live `UNIQUE(customer_id, organization_id)` constraint, increments both current/lifetime points, and journals the computed balance. Added a missing-row regression test. Phase B will replace this read/write sequence with the planned atomic RPC. | Orchestrator checkpoint after A1 tests |
| A1-LINT | `src/app/**`; `src/components/**`; `src/hooks/**`; `eslint.config.mjs:8` | baseline / lint correctness | The Next 16 lint baseline had 179 errors, including 53 synchronous effect-state cascades, render-time clock reads, prop-mirrored state, manual memoization conflicts, and 106 legacy explicit-`any` integration/schema casts. | Restructured effect-driven loads onto asynchronous callbacks; derived validation directly; moved package resizing into the input event; initialized transaction-return lines at fetch completion; stabilized render clocks; removed stale memoization and CommonJS import; applied mechanical const fixes. Explicit-any remains visible as warnings (not disabled) because Phase A permits targeted live-schema/generated-type casts; all other rules remain hard errors. | Orchestrator checkpoint after A1 lint |
| A2-SYNC-DATE | `src/app/(backoffice)/settings/dutchie/page.tsx:40` | API response / date rendering | Sync History read nonexistent `created_at`, so every Date cell rendered `--`; formatting also used the browser's zone. | Use the schema-authoritative `started_at` field, reject invalid dates, and format with `America/Denver` plus the Mountain zone abbreviation. | Orchestrator checkpoint after A2 UI/API audit |
| A2-SCHEMA-CHECKS | `src/app/api/inventory/convert/route.ts:101`; `src/app/api/products/bulk/deactivate/route.ts:112`; `src/lib/services/{campaignService,discountManagementService,inventoryReceivingService,onlineOrderService,productManagementService}.ts` | live schema / CHECK conformance | Static write inventory found eight literal values rejected by the live CHECK constraints: audit events `convert`/`deactivate`, campaign statuses `scheduled`/`cancelled`, discount status `inactive`, testing status `exempt`, and online-order status `expired`. | Mapped each transition to the closest legal live value: audit `adjust`/`update`, campaign `active`/`archived`, discount `disabled`, testing `untested`, and order `cancelled`. No DDL was written. | Orchestrator checkpoint after A2 schema audit |
| A2-RESPONSE | `src/app/(backoffice)/customers/**`; inventory/manifest/marketing pages and modals; `src/components/terminal/DrawerCloseModal.tsx` | API response contract | Consumers used stale generic fallbacks (`data`, `history`, `transactions`, top-level role) instead of the named keys actually returned by their routes. Customer-field settings also sent `{sections}` although the PATCH schema accepts `pos`/`backend`/`prescription`, and campaign analytics rendered fields absent from its API. | Aligned all statically traced reads to route response keys, converted field visibility between UI sections and the API record contract, unwrapped product/session payloads, and normalized campaign analytics from the API counters with numeric defaults. The response-key inventory now reports zero mismatches. | Orchestrator checkpoint after A2 API audit |
| A2-RECONCILIATION | `src/app/(backoffice)/reports/reconciliation/page.tsx:44`; `src/app/api/reconciliation/manual/route.ts:1`; `src/lib/services/reconciliationService.ts:119` | UI dead-end / authorization | After S6 made the cron POST fail closed, the authenticated “Run Now” button still called that cron-only endpoint without a secret. Reconciliation list/detail service-role reads also accepted resource IDs without an organization predicate. | Added a separate session-authenticated manual endpoint that validates the requested location against the session organization; pointed the UI to it; scoped list/detail reads through `locations.organization_id`. The cron endpoint remains strictly secret-only. | Orchestrator checkpoint after A2 UI/security audit |
| A2-NAV-FETCH | `scripts/phase-a-inventory.mjs`; navigation/fetch consumers listed below | broken links / API methods | Static inventory found two dead navigation targets and 15 missing/wrong-method fetches, including nonexistent subroom, manifest-search, label-print, adjustment, image-reorder, and base-collection DELETE endpoints. | Pointed links to real edit/report pages; aligned dynamic DELETE and image methods; reused existing rooms/inventory/labels APIs; added an org-scoped marketing-tag DELETE; repaired adjustment payload/path; and made multi-label printing use the existing generation API. Final inventory is zero-dead. | Orchestrator checkpoint after A2 route audit |
| S5-IDOR | 66 dynamic resource handlers marked in the matrix | security / tenant isolation | The required S5 spot-audit found resource-ID handlers whose service-role queries do not expose a tenant predicate. The matrix deliberately keeps each one marked `S5-IDOR`; reconciliation list/detail were fixed during A2. | Unfixed in this checkpoint: S5's plan scope is a spot-audit + per-route matrix, and these handlers require route-specific ownership semantics rather than a blind generic predicate. They remain explicit security debt and must block a production-security signoff even though the requested S5 inventory deliverable is complete. | No fix — explicit unresolved finding |
| S5-ORDER-CAP | `src/app/api/orders/[id]/route.ts:5` | security / public capability | Public order status/cancellation uses possession of the UUID as its only capability; adding a customer cancellation token requires schema storage and rotation semantics. | GET/PATCH staff mutations are organization scoped. Customer cancellation-token DDL is deferred to the Phase B migration per the no-DDL Phase A rule. | Deferred to Phase B migration |

## Verification log

| Cluster | Command | Exit | Result |
|---|---|---:|---|
| A-SEC S1 red | `npx vitest run src/lib/auth/__tests__/session.test.ts src/app/api/settings/dutchie-config/__tests__/authorization.test.ts` | 1 | Expected failures reproduced: foreign-org override accepted, cookie name trusted, non-manager Dutchie access allowed. |
| A-SEC S1/S2 initial green | `npx vitest run src/lib/auth/__tests__/session.test.ts src/app/api/settings/dutchie-config/__tests__/authorization.test.ts` | 0 | 2 files, 3 tests passed. |
| A-SEC S1 baseline comparison | `npm run typecheck` | 1 | Known A1 baseline errors remain; no errors originate from the S1 implementation or its tests. Full repair is deferred to A1 per required phase order. |
| A-SEC S4 red | `npx vitest run src/app/api/settings/dutchie-config/__tests__/authorization.test.ts` | 1 | Expected failure reproduced: stored key was returned in the overloaded `config.apiKey` field instead of boolean + masked-tail metadata. |
| A-SEC S2-S4 | `npx vitest run src/lib/dutchie/__tests__/client.test.ts src/app/api/settings/dutchie-config/__tests__/authorization.test.ts src/lib/auth/__tests__/session.test.ts` | 0 | 3 files, 5 tests passed. |
| A-SEC S6 red | `npx vitest run src/app/api/orders/expire/__tests__/route.test.ts` | 1 | Expected failure reproduced: unset `CRON_SECRET` executed the protected job and returned 200. |
| A-SEC S2-S6 | `npx vitest run src/app/api/dutchie/cron/__tests__/route.test.ts src/app/api/orders/expire/__tests__/route.test.ts src/lib/dutchie/__tests__/client.test.ts src/app/api/settings/dutchie-config/__tests__/authorization.test.ts src/lib/auth/__tests__/session.test.ts` | 0 | 5 files, 11 tests passed. |
| A-SEC post-cluster typecheck | `npm run typecheck` | 1 | Known A1 baseline remains; S3 removed the two pre-existing missing `DutchieTransaction` errors. No new A-SEC errors. |
| A1 typecheck repair | `npm run typecheck` | 0 | The measured 52-error baseline is repaired; standard project typecheck completes with zero errors. |
| A1 BioTrack/referral cluster | `npm run typecheck`; `npx vitest run src/lib/biotrack/__tests__/biotrack.test.ts src/lib/services/__tests__/segmentsReferrals.test.ts` | 0 | Typecheck passed; 2 files and 19 targeted tests passed. |
| A1 lint cluster | `npm run typecheck`; `npm run lint` | 0 | Typecheck passed. Lint exits 0 with zero errors; the latest run reports 217 visible warnings (targeted explicit-any integration/schema casts plus pre-existing unused/dependency warnings). |
| A2 targeted regression cluster | `npx vitest run src/components/shared/__tests__/shared.test.tsx src/components/terminal/__tests__/terminal.test.ts src/lib/services/__tests__/{customerService,inventoryAdjustment,inventoryReceiving,marketing,onlineOrder,reconciliation,settings}.test.ts`; `npm run typecheck` | 0 | 9 files and 95 tests passed; follow-up typecheck passed with zero errors. |
| A2 final inventories/lint | `node scripts/phase-a-inventory.mjs`; `npm run lint` | 0 | Inventory reports zero dead navigation targets, dead fetch/method targets, response-key mismatches, and live-CHECK literal violations. Lint exits 0 with zero errors and 217 warnings. |
| Phase A final typecheck | `npm run typecheck` | 0 | Final TypeScript gate passed with zero errors. |
| Phase A final test suite | `npm run test` | 0 | Final Vitest run passed: 37 files, 335 tests, zero failures. |

## S5 per-route service-role security matrix

Legend: `PASS` has an explicit session/role/cron boundary and an organization/location predicate (or an intentional minimal public contract). `S5-IDOR` is a resource-ID handler whose tenant predicate is not statically visible and remains a concrete Phase A finding to close.

| Route | Methods | Boundary | Service-role scope / status |
|---|---|---|---|
| `/api/auth/locations` | GET | None | PASS — intentional pre-login safe location projection |
| `/api/auth/logout` | POST | Auth flow | PASS — authentication teardown only |
| `/api/auth/manager-verify` | POST | Session | PASS — organization predicate |
| `/api/auth/me` | GET | Optional session | PASS — signed session before database access |
| `/api/auth/pin-login` | POST | Auth flow | PASS — authentication entry; selected location determines organization |
| `/api/badges` | GET,POST | Session | PASS — organization predicate |
| `/api/badges/[id]` | GET,PATCH,DELETE | Session | PASS — organization predicate |
| `/api/badges/[id]/members` | POST,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/biotrack/config` | GET,POST,DELETE | Session | PASS — organization predicate |
| `/api/biotrack/generate-package-id` | POST | Session | PASS — location predicate / location-owned service |
| `/api/biotrack/inventory-sync` | POST | Cron secret | PASS — fail-closed bearer |
| `/api/biotrack/retry` | POST | Cron secret | PASS — fail-closed bearer |
| `/api/biotrack/status` | GET | Session | PASS — location predicate / location-owned service |
| `/api/brands` | GET,POST | Session | PASS — organization predicate |
| `/api/brands/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/campaigns` | GET,POST | Session | PASS — organization predicate |
| `/api/campaigns/[id]` | GET,PATCH | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/campaigns/[id]/analytics` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/campaigns/[id]/recipients` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/campaigns/[id]/schedule` | POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/campaigns/[id]/send` | POST | Session | PASS — organization predicate |
| `/api/cart/config` | GET | Session | PASS — organization predicate |
| `/api/cash-drawers` | POST | Session | PASS — location predicate / location-owned service |
| `/api/categories` | GET,POST | Session | PASS — organization predicate |
| `/api/categories/[id]` | GET,PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/customer-groups` | GET,POST | Session | PASS — organization predicate |
| `/api/customer-groups/[id]` | GET,PATCH | Session | PASS — organization predicate |
| `/api/customer-groups/[id]/members/bulk` | POST,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/customers` | GET,POST | Session | PASS — organization predicate |
| `/api/customers/[id]` | GET,PATCH | Session | PASS — organization predicate |
| `/api/customers/[id]/badges` | GET,PATCH | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/customers/[id]/groups` | PATCH | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/customers/[id]/loyalty/adjust` | POST | Session | PASS — organization predicate |
| `/api/customers/[id]/loyalty/history` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/customers/[id]/purchase-history` | GET | Session | PASS — location predicate / location-owned service |
| `/api/customers/[id]/transaction-history` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/customers/bulk` | PATCH | Session | PASS — organization predicate |
| `/api/customers/configure/badge-priority` | GET,PATCH | Session | PASS — organization predicate |
| `/api/customers/configure/doctors` | GET,POST | Session | PASS — organization predicate |
| `/api/customers/configure/doctors/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/customers/configure/fields` | GET,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/customers/configure/qualifying-conditions` | GET,POST | Session | PASS — organization predicate |
| `/api/customers/configure/qualifying-conditions/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/customers/duplicates/merge` | POST | Session | PASS — organization predicate |
| `/api/customers/duplicates/scan` | POST | Session | PASS — organization predicate |
| `/api/customer-types` | GET | Session | PASS — authenticated non-resource handler |
| `/api/dashboard` | GET | Session | PASS — location predicate / location-owned service |
| `/api/delivery/check-address` | POST | None | PASS — intentional storefront eligibility check |
| `/api/delivery/config` | GET,PUT | Session | PASS — organization predicate |
| `/api/delivery/drivers` | GET,POST | Session | PASS — organization predicate |
| `/api/delivery/vehicles` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/delivery/zones` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/delivery/zones/[id]` | PATCH | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/discounts` | GET,POST | Session | PASS — organization predicate |
| `/api/discounts/[id]` | GET,PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/discounts/[id]/duplicate` | POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/drivers` | GET | Session | PASS — organization predicate |
| `/api/dutchie/cron` | GET,POST | Cron secret | PASS — fail-closed bearer |
| `/api/dutchie/jobs` | GET | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/dutchie/locations` | GET,POST | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/dutchie/sync` | POST | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/dutchie/sync/log` | GET | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/dutchie/test-connection` | POST | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/employees` | GET,POST | Session | PASS — organization predicate |
| `/api/employees/[id]` | GET,PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/employees/[id]/locations` | PUT | Session | PASS — location predicate / location-owned service |
| `/api/employees/[id]/permissions` | PUT | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/employees/[id]/pin` | POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/events` | GET,POST | Session | PASS — organization predicate |
| `/api/events/[id]` | PATCH | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/fees-donations` | GET,POST,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/health` | GET | None | PASS — public liveness returns aggregate status only |
| `/api/inventory` | GET | Session | PASS — organization predicate |
| `/api/inventory/[id]/adjust` | POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/inventory/[id]/move` | POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/inventory/audits` | GET,POST | Session | PASS — organization predicate |
| `/api/inventory/audits/[id]` | GET,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/inventory/audits/[id]/items` | GET,POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/inventory/bulk` | PATCH | Session | PASS — organization predicate |
| `/api/inventory/check` | GET | Session | PASS — location predicate / location-owned service |
| `/api/inventory/combine` | POST | Session | PASS — organization predicate |
| `/api/inventory/convert` | POST | Session | PASS — organization predicate |
| `/api/inventory/destroy` | POST | Session | PASS — organization predicate |
| `/api/inventory/items/[id]` | GET,PATCH | Session | PASS — organization predicate |
| `/api/inventory/items/[id]/history` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/inventory/items/[id]/transactions` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/inventory/journal` | GET | Session | PASS — location predicate / location-owned service |
| `/api/inventory/lab-sample` | POST | Session | PASS — organization predicate |
| `/api/inventory/last-cost/[productId]` | GET | Session | PASS — location predicate / location-owned service |
| `/api/inventory/manifests` | GET | Session | PASS — organization predicate |
| `/api/inventory/manifests/[id]/accept` | POST | Session | PASS — organization predicate |
| `/api/inventory/manifests/list` | GET | Session | PASS — organization predicate |
| `/api/inventory/receive` | POST | Session | PASS — organization predicate |
| `/api/inventory/receive-history` | GET | Session | PASS — location predicate / location-owned service |
| `/api/inventory/sublot` | POST | Session | PASS — organization predicate |
| `/api/inventory/transfers` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/labels/generate` | POST | Session | PASS — authenticated non-resource handler |
| `/api/labels/templates` | GET,POST | Session | PASS — organization predicate |
| `/api/labels/templates/[id]` | GET,PATCH | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/locations/[id]` | GET,PATCH | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/locations/[id]/settings` | GET,PUT | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/loyalty/adjust` | POST | Session | PASS — organization predicate |
| `/api/loyalty/adjustment-reasons` | GET,POST | Session | PASS — organization predicate |
| `/api/loyalty/config` | GET,PUT | Session | PASS — organization predicate |
| `/api/loyalty/tiers` | GET,POST | Session | PASS — organization predicate |
| `/api/loyalty/tiers/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/manifests` | GET,POST | Session | PASS — organization predicate |
| `/api/manifests/[id]` | GET,PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/manifests/[id]/export` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/manifests/[id]/history` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/manifests/[id]/items` | POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/manifests/[id]/items/[itemId]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/manifests/[id]/receive` | POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/manifests/[id]/reopen` | POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/manifests/[id]/send` | POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/manifests/export` | GET | Session | PASS — organization predicate |
| `/api/marketing-tags` | GET,POST | Session | PASS — organization predicate |
| `/api/orders` | POST,GET | Session | PASS — POST storefront create; GET session + organization join |
| `/api/orders/[id]` | GET,PATCH | Session | MIXED — public UUID-capability status GET; PATCH session + organization |
| `/api/orders/[id]/cancel` | POST | None | DEFERRED Phase B migration — public UUID capability needs a customer cancellation token |
| `/api/orders/expire` | POST | Cron secret | PASS — fail-closed bearer |
| `/api/permission-groups` | GET,POST | Session | PASS — organization predicate |
| `/api/permission-groups/[id]` | GET,PATCH,PUT | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/producers` | GET,POST | Session | PASS — organization predicate |
| `/api/producers/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/product-kits` | GET,POST | Session | PASS — organization predicate |
| `/api/product-kits/[id]` | GET,PATCH,DELETE | Session | PASS — organization predicate |
| `/api/product-kits/[id]/items` | POST,DELETE | Session | PASS — organization predicate |
| `/api/products` | GET,POST | Session | PASS — organization predicate |
| `/api/products/[id]` | GET,PATCH,DELETE | Session | PASS — organization predicate |
| `/api/products/[id]/analytics` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/products/[id]/images` | GET,POST,PATCH,PUT,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/products/[id]/label-settings` | GET,PUT | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/products/[id]/price-history` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/products/[id]/prices` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/products/[id]/tags` | GET,PUT | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/products/barcode/[code]` | GET | Session | PASS — location predicate / location-owned service |
| `/api/products/bulk/deactivate` | POST | Session | PASS — organization predicate |
| `/api/products/bulk/price-update` | POST | Session | PASS — organization predicate |
| `/api/products/bulk/tags` | POST | Session | PASS — authenticated non-resource handler |
| `/api/products/export` | GET | Session | PASS — authenticated non-resource handler |
| `/api/products/import` | POST | Session | PASS — organization predicate |
| `/api/products/match` | GET | Session | PASS — organization predicate |
| `/api/products/search` | GET | Session | PASS — location predicate / location-owned service |
| `/api/purchase-orders` | GET,POST | Session | PASS — organization predicate |
| `/api/purchase-orders/[id]` | GET,PATCH | Session | PASS — organization predicate |
| `/api/purchase-orders/[id]/lines` | POST,DELETE | Session | PASS — organization predicate |
| `/api/reconciliation` | GET,POST | Session / cron secret | PASS — GET organization scoped; POST fail-closed bearer |
| `/api/reconciliation/[id]` | GET | Session | PASS — organization predicate through location |
| `/api/reconciliation/manual` | POST | Session | PASS — requested location validated against organization |
| `/api/referrals` | POST | Session | PASS — organization predicate |
| `/api/referrals/config` | GET,PUT | Session | PASS — organization predicate |
| `/api/registers` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/registers/[id]` | GET,PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/registers/configure/guestlist-entries` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/registers/configure/guestlist-entries/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/registers/configure/guestlist-statuses` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/registers/configure/guestlist-statuses/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/registers/configure/order-sources` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/registers/configure/order-sources/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/registers/configure/settings` | GET,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/registers/configure/transaction-reasons` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/registers/configure/transaction-reasons/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/registers/overview` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/closing` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/cogs` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/expiring` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/low-stock` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/sales-summary` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/schedules` | GET,POST | Session | PASS — organization predicate |
| `/api/reports/schedules/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/reports/schedules/execute` | POST | Cron secret | PASS — fail-closed bearer |
| `/api/reports/shrinkage` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/transactions` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/transactions/[id]` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/reports/valuation` | GET | Session | PASS — location predicate / location-owned service |
| `/api/rooms` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/rooms/[id]` | PATCH | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/segments` | GET,POST | Session | PASS — organization predicate |
| `/api/segments/[id]` | GET,PATCH | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/segments/preview` | POST | Session | PASS — organization predicate |
| `/api/settings/adjustment-reasons` | GET,POST | Session | PASS — organization predicate |
| `/api/settings/adjustment-reasons/[id]` | PATCH,DELETE | Session | PASS — organization predicate |
| `/api/settings/biotrack-config` | GET,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/settings/biotrack-config/destruction-queue` | GET,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/settings/biotrack-config/test-connection` | POST | Session | PASS — location predicate / location-owned service |
| `/api/settings/dosages` | GET,POST | Session | PASS — organization predicate |
| `/api/settings/dosages/[id]` | PATCH,DELETE | Session | PASS — organization predicate |
| `/api/settings/dutchie-config` | GET,PATCH | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/settings/dutchie-config/test-connection` | POST | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/settings/inventory-statuses` | GET,POST | Session | PASS — organization predicate |
| `/api/settings/inventory-statuses/[id]` | PATCH,DELETE | Session | PASS — organization predicate |
| `/api/settings/location-settings` | GET,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/settings/package-formats` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/settings/package-formats/[id]` | PATCH,DELETE | Session | PASS — location predicate / location-owned service |
| `/api/settings/package-formats/preview` | POST | Session | PASS — authenticated non-resource handler |
| `/api/settings/pricing-tier-groups` | GET,POST | Session | PASS — organization predicate |
| `/api/settings/pricing-tier-groups/[id]` | PATCH,DELETE | Session | PASS — organization predicate |
| `/api/settings/pricing-tiers` | GET,POST | Session | PASS — organization predicate |
| `/api/settings/pricing-tiers/[id]` | PATCH,DELETE | Session | PASS — organization predicate |
| `/api/settings/printers` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/settings/printers/[id]` | GET,PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/settings/printers/[id]/assignments` | GET,POST,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/settings/print-service` | GET,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/settings/product-fields` | GET,PUT | Session | PASS — location predicate / location-owned service |
| `/api/smart-tags` | GET,POST | Session | PASS — organization predicate |
| `/api/smart-tags/[id]` | PATCH,DELETE | Session | PASS — organization predicate |
| `/api/smart-tags/[id]/run` | POST | Session | PASS — organization predicate |
| `/api/smart-tags/run-all` | POST | Session | PASS — organization predicate |
| `/api/strains` | GET,POST | Session | PASS — organization predicate |
| `/api/strains/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/tags` | GET,POST | Session | PASS — organization predicate |
| `/api/tags/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/tax-rates` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/tax-rates/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/templates` | GET,POST | Session | PASS — organization predicate |
| `/api/templates/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/templates/[id]/preview` | POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/terminal/drawer/close` | POST | Session | PASS — location predicate / location-owned service |
| `/api/terminal/queue` | GET,POST,PATCH,DELETE | Session | PASS — location predicate / location-owned service |
| `/api/terminal/receipt/[transactionId]` | GET | Session | PASS — location predicate / location-owned service |
| `/api/terminal/receipt/recent` | GET | Session | PASS — authenticated non-resource handler |
| `/api/time-clock` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/transactions` | POST | Session | PASS — organization predicate |
| `/api/transactions/[id]/return` | POST | Session | PASS — organization predicate |
| `/api/transactions/[id]/void` | POST | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/vendors` | GET,POST | Session | PASS — organization predicate |
| `/api/vendors/[id]` | PATCH,DELETE | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/workflows` | GET,POST | Session | PASS — organization predicate |
| `/api/workflows/[id]` | GET,PATCH | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |
| `/api/workflows/[id]/executions` | GET | Session | S5-IDOR — authenticated resource ID lacks visible tenant predicate |

S5 inventory output: 231 route handlers inventoried (the matrix includes every `src/app/api/**/route.ts`, including the Phase A manual reconciliation route). Dynamic resource routes marked `S5-IDOR` are tracked under finding S5-IDOR and are not silently treated as scoped.

## A2 route, fetch, response, and schema inventory output

Command: `node scripts/phase-a-inventory.mjs` (exit 0)

```text
PAGE_ROUTES=102
NAV_TARGETS=89
DEAD_NAV_TARGETS=0
API_ROUTES=231
CLIENT_FETCHES=394
DEAD_FETCH_TARGETS=0
RESPONSE_KEY_READS=312
RESPONSE_KEY_MISMATCHES=0
DB_WRITES=310
CONSTRAINED_LITERAL_WRITES=45
SCHEMA_LITERAL_VIOLATIONS=0
```

The DB-write count covers statically resolvable `.insert`/`.update`/`.upsert` chains. Literal CHECK values are validated against `.route/schema-constraints.json`; generated TypeScript types plus the A1 typecheck cover known NOT NULL/FK shapes. Dynamic payloads remain subject to their route validators and were manually reviewed where the inventory identified an API mismatch.

## Null-location render inventory

Inspected with the selected-location store unhydrated/null: `/dashboard`, `/delivery`, `/employees/time-clock`, `/inventory`, `/inventory/audits`, `/inventory/journal`, `/inventory/manifests`, `/inventory/purchase-orders`, `/inventory/receive`, `/inventory/receive-history`, `/inventory/transfers`, `/orders`, `/products`, `/registers`, `/reports/closing`, `/reports/cogs`, `/reports/inventory`, `/reports/reconciliation`, `/reports/sales`, `/reports/transactions`, `/settings/delivery`, `/settings/dutchie`, `/settings/labels`, `/settings/receipts`, `/settings/rooms`, `/settings/taxes`, and `/terminal/checkout`. No render-time non-null assertion or null property dereference remains; backoffice fetches omit `location_id` until selected and server routes fall back to the signed session location, while terminal checkout uses the signed session directly.
