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
| S5-IDOR | `src/lib/auth/ownership.ts:1`; 65 route files listed in the matrix | security / tenant isolation | The S5 audit identified 65 dynamic route files whose handlers accessed service-role data by resource ID without proving tenant ownership first. (The previously reported total of 66 combined these 65 matrix rows with S5-ORDER-CAP.) | Added one fail-closed `assertOrgOwnership` boundary with direct `organization_id`, resource `location_id → locations.organization_id`, and child→parent ownership modes. Every exported handler in all 65 files now invokes it before sensitive detail reads or mutations; location-specific domains also bind `session.locationId`, and mutation payload foreign keys are checked where applicable. Added a source-enforced handler matrix test plus five foreign-organization negative route tests. | Orchestrator checkpoint after S5 matrix closeout |
| S5-ORDER-CAP | `src/lib/auth/orderCapability.ts:1`; `src/app/api/orders/{route.ts,[id]/route.ts,[id]/cancel/route.ts}`; storefront checkout/status pages | security / public capability | Public order status and cancellation used possession of the order UUID as the only capability. | Resolved without DDL: order creation returns a stateless HMAC-SHA256 capability bound to the order ID and `SESSION_SECRET`; the storefront carries it in the URL fragment and sends it as a bearer token. Public status/cancellation fail closed with 404 on missing/invalid tokens, use timing-safe verification, and staff access still requires session plus `assertOrgOwnership`. Added UUID-only rejection and valid-token tests for both status and cancellation. | Orchestrator checkpoint after public order capability closeout |

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
| S5 foreign-org negative red | `npx vitest run src/app/api/__tests__/tenant-ownership.test.ts` | 1 | All five required negative cases reproduced the vulnerability: customer, order, workflow, inventory, and transaction routes returned 200 for foreign resource IDs. |
| S5 handler-matrix red | `npx vitest run src/lib/auth/__tests__/ownership-matrix.test.ts` | 1 | Source-enforced matrix initially reported 60 unguarded route files after the first five negative-test routes were wired. |
| S5 public-order capability red | `npx vitest run src/app/api/orders/[id]/cancel/__tests__/route.test.ts` | 1 | UUID possession without any proof reached `cancelOrder` and returned 200. |
| S5 ownership/capability targeted green | `npx vitest run src/lib/auth/__tests__/ownership.test.ts src/lib/auth/__tests__/ownership-matrix.test.ts src/app/api/__tests__/tenant-ownership.test.ts src/app/api/orders/[id]/__tests__/route.test.ts src/app/api/orders/[id]/cancel/__tests__/route.test.ts`; `npm run typecheck` | 0 | 5 files and 13 tests passed. Direct-org, selected-location, child-parent, all-handler coverage, five foreign-org route negatives, and missing/valid status/cancellation capability cases passed; follow-up typecheck passed. |
| S5 inventory/lint | `node scripts/phase-a-inventory.mjs`; `npm run lint` | 0 | Inventory remains zero-dead/zero-response-mismatch/zero-schema-violation. Lint exits 0 with zero errors and 207 warnings. |
| S5 closeout final typecheck | `npm run typecheck` | 0 | Final TypeScript gate passed with zero errors. |
| S5 closeout final test suite | `npm run test` | 0 | Final Vitest run passed: 42 files, 348 tests, zero failures. |

## Phase B

Scope: `.route/PLAN.md` v4 sections B1, B2, and B3 only. Schema decisions use `.route/schema-constraints.json` as authority. The migration below was written but intentionally not applied; live application and concurrency verification remain the orchestrator's Supabase-MCP checkpoint.

### Findings, migrations, and design decisions

| ID | File:line | Class | Finding | Fix | Fix commit |
|---|---|---|---|---|---|
| B1-MIGRATION | `supabase/migrations/20260402160000_dutchie_loyalty_sync.sql:6` | migration / numeric integrity | Live loyalty balances and journals used integer point columns even though Dutchie returns decimal balances; the live unique balance constraint is absent from historical migrations, and sale/void/return SQL declared integer loyalty variables. | Added one drift-defensive migration (not applied): widens balance/journal values to `NUMERIC(12,2)`, restores the customer/org unique index, dynamically preserves and widens the live `create_sale_transaction`, `void_transaction`, and `create_return_transaction` bodies, and reloads PostgREST. Missing dependent functions are conditionally ignored. | — orchestrator checkpoint pending |
| B1-STATE | `supabase/migrations/20260402160000_dutchie_loyalty_sync.sql:32` | migration / resumability | Config timestamps could not represent org-scoped work or an in-progress transaction window. | Added `dutchie_sync_state` with expression uniqueness for nullable org scopes, JSON cursors, enablement, and designated credentials. Seeded org and location state from existing config timestamps; registers are location-scoped rather than piggybacking on org-wide reference work. | — orchestrator checkpoint pending |
| B1-STAGING | `supabase/migrations/20260402160000_dutchie_loyalty_sync.sql:133`; `src/lib/dutchie/loyaltySync.ts:103` | data integrity / resumability | A 108k-row loyalty snapshot cannot be safely applied as an in-memory read-then-write operation or restarted after a deadline. | Added value-sensitive fingerprinted staging, an explicit `staging_complete` barrier so partially inserted snapshots can never apply, resumable run IDs, a one-query customer match count, the 30% guard before any balance RPC, chunk draining, durable unapplied rows, success-only checkpointing, and age-based cleanup. | — orchestrator checkpoint pending |
| B1-ATOMIC-RPCS | `supabase/migrations/20260402160000_dutchie_loyalty_sync.sql:283`; `supabase/migrations/20260402160000_dutchie_loyalty_sync.sql:372` | concurrency / journal integrity | Snapshot deltas and local adjustments could race and lose points or double-journal. | Added service-role-only `apply_dutchie_loyalty_chunk` and `adjust_loyalty_points`: both create missing rows safely, acquire deterministic row locks, apply relative deltas, reject negative balances, and journal with `(customer_id,dutchie_run_id)` idempotency. Duplicate-customer transfers lock winner/loser in ID order. | — orchestrator checkpoint pending |
| B1-WRITERS | `src/lib/services/loyaltyAdjustmentService.ts:20`; `src/lib/services/referralService.ts:13`; `src/app/api/customers/[id]/loyalty/adjust/route.ts:30`; `src/app/api/customers/duplicates/merge/route.ts:79` | concurrency / read-then-write | Four application paths independently read and rewrote `current_points`; referral creation could race from a missing row and duplicate merge could race both balances. | Routed every named writer through `adjust_loyalty_points`; preserved lifetime accrual explicitly; made merge use the loser UUID as its idempotency reference; corrected merge audit events to schema-legal `combine`. The source grep test rejects reintroduction of direct current-point read/write in these writers. | — orchestrator checkpoint pending |
| B1-CLIENT | `src/lib/dutchie/client.ts:169`; `src/lib/dutchie/client.ts:240` | upstream API / rate limit | The generic Dutchie GET path retries, which is unsafe for the loyalty endpoint's one-request-per-minute contract; incremental overlap was only one minute. | Added a dedicated loyalty snapshot method with exactly one HTTP attempt and aggregate-only logging. Customers/products now use a 15-minute `fromLastModifiedDateUTC` overlap; customer/inventory pagination accepts the cron deadline. | — orchestrator checkpoint pending |
| B1-UI | `src/app/api/settings/dutchie-config/route.ts:8`; `src/app/(backoffice)/settings/dutchie/page.tsx:93` | config / UI | Transactions were present only in UI state, loyalty had no tile, and no org-designated credential was configurable. | Round-tripped transaction and loyalty toggles/timestamps through migration, loader, API, UI, and engine; added the loyalty tile, manual sync action, last-sync display, and organization-validated designated-location selector without exposing API keys. | — orchestrator checkpoint pending |
| B1-CONFIG-AUTHORITY | `src/lib/dutchie/loyaltySync.ts:112`; `src/app/api/settings/dutchie-config/route.ts:209`; `src/lib/dutchie/configLoader.ts:71` | org scope / cache correctness | A designated loyalty credential could retain a stale location toggle, PATCH responses could erase the designated state until reload, and organization-qualified config cache entries survived location invalidation. | Made the NULL-location `dutchie_sync_state` row authoritative for loyalty enablement/checkpoint metadata, preserved that row in every PATCH response, invalidated both plain and `org:location` cache keys, and added a regression test for immediate org-qualified invalidation. | — orchestrator checkpoint pending |
| B2-LEASE | `src/lib/dutchie/syncLease.ts:8`; `src/lib/dutchie/syncLease.ts:53`; `supabase/migrations/20260402160000_dutchie_loyalty_sync.sql:211` | concurrency / single-flight | Sync logs were observability rows, not locks, so parallel serverless instances could run the same work and leave orphaned `running` rows; silently failed heartbeats could permit an unsafe stale reap. | Added organization ID and heartbeat, dual partial unique running indexes for exact org/location scopes, five-minute stale reaping, checked per-batch heartbeats/completion, 409 conflict translation, and fail/completion closure for every leased path. Loyalty staging is independent of the lease and survives stale reaping. | — orchestrator checkpoint pending |
| B2-CHECKPOINT | `src/lib/dutchie/syncState.ts:6`; `src/lib/dutchie/syncEngine.ts:96`; `src/lib/dutchie/syncEngine.ts:169` | incremental correctness | Existing checkpoints advanced only when records were fetched and still advanced after partial or silently ignored secondary-write failures. | Centralized success-only durable checkpointing: zero-fetch success advances; mapping/upsert/checkpoint errors hold; active employee-location, FK preparation, inventory lookup/deactivation, and transaction lookup helpers now surface database failures; customers/products apply a 15-minute overlap from authoritative state. | — orchestrator checkpoint pending |
| B2-BISECTION | `src/lib/dutchie/batchIsolation.ts:1`; `src/lib/dutchie/syncEngine.ts:51` | fault isolation | One invalid row caused an entire 1,000-row upsert batch to fail. | Added recursive statement-level bisection. Good halves persist, one-row offenders are quarantined into `error_details`, counters reflect 999 successes/1 error, and the checkpoint remains held. | — orchestrator checkpoint pending |
| B2-TRANSACTIONS | `src/lib/dutchie/syncEngine.ts:1019`; `supabase/migrations/20260402160000_dutchie_loyalty_sync.sql:495` | resumability / atomicity | Transaction history accumulated all windows in memory, had inclusive boundary-day overlap, checkpointed only at the end, and deleted payments before reinsertion. | Aligned 55-day windows to UTC day boundaries with exclusive end dates; persist and checkpoint each completed window cursor before the next; thread deadlines into the loop; advance the authoritative checkpoint only after all windows; replace payments in one rollback-safe RPC; removed the obsolete in-memory persistence branch so the durable path is the sole implementation. | — orchestrator checkpoint pending |
| B2-SCOPE | `src/lib/dutchie/syncPolicy.ts:3`; `src/lib/dutchie/syncEngine.ts:123`; `src/lib/dutchie/syncEngine.ts:984`; `src/lib/dutchie/syncEngine.ts:1296` | tenancy / work ownership | Products/employees/registers were classified as org-wide even though they write location projections, `syncAllLocations` did not filter config rows by organization, and internal credential loads trusted a location UUID without the supplied organization. | Classified only reference/customers/loyalty as org-wide; made products/employees/inventory/rooms/registers/transactions location-scoped; split registers from reference sync; organization-scoped both config enumeration and every credential lookup before service-role work. | — orchestrator checkpoint pending |
| B3-QUEUE | `src/lib/dutchie/cronRunner.ts:36`; `src/lib/dutchie/cronRunner.ts:111` | scheduler / fairness | The Phase A cron body was a 501 stub and had no durable prioritization or virgin-state protection. | Built a least-recently-synced queue with one work item per org-wide entity and one per enabled location entity; null checkpoints return `needs initial manual sync`; recent loyalty is suppressed for 20 hours unless complete staging is pending; work runs sequentially until the 250-second deadline. | — orchestrator checkpoint pending |
| B3-ROUTE-SCHEDULE | `src/app/api/dutchie/cron/route.ts:6`; `vercel.json:15`; `vercel.json:56` | scheduler / authentication | Valid cron auth reached only a stub and Dutchie functions inherited a 30-second limit with no schedule. | Kept the shared fail-closed GET/POST bearer boundary, invoked the queue without a user session, set Dutchie functions to 300 seconds, and added 04:00/12:00/18:00/23:00 UTC schedules. | — orchestrator checkpoint pending |

### Phase B verification log

| Cluster | Command | Exit | Result |
|---|---|---:|---|
| B1/B2 acceptance red | `npx vitest run src/lib/dutchie/__tests__/phaseB.test.ts src/lib/dutchie/__tests__/migrationContract.test.ts` | 1 | Expected red state: migration and loyalty/policy/bisection modules did not exist. |
| B1 initial gates | `npm run typecheck`; targeted Dutchie/client/referral tests | 0 | Typecheck passed; 4 files and 23 tests passed after the referral mock was migrated to the atomic RPC. |
| B2/B3 targeted gates | `npm run typecheck`; `npx vitest run src/lib/dutchie/__tests__ src/app/api/dutchie/cron/__tests__/route.test.ts src/app/api/settings/dutchie-config/__tests__ src/lib/services/__tests__/segmentsReferrals.test.ts` | 0 | Typecheck passed; 8 files and 40 tests passed, covering decimal mapping, fingerprints, pre-apply guard, toggles, checkpoints, stale/409 leases, 999/1000 bisection, queue scope, loyalty cadence/resume, migration contracts, one-attempt snapshot, exclusive windows, and cron auth. |
| Phase B interim full suite | `npm run test` | 0 | 46 files and 371 tests passed before final closeout additions. |
| Phase B lint | `npm run lint` | 0 | ESLint exits with zero errors and 226 warnings under the repository's established warning policy. |
| B1/B2/B3 adversarial closeout cluster | `npm run typecheck`; `npx vitest run src/lib/dutchie/__tests__ src/app/api/dutchie/cron/__tests__/route.test.ts src/app/api/settings/dutchie-config/__tests__ src/lib/services/__tests__/segmentsReferrals.test.ts src/lib/services/__tests__/loyaltyAdjustmentAtomic.test.ts` | 0 | Typecheck passed; 10 files and 43 tests passed after org-state authority, cache invalidation, checked lease heartbeats, organization-scoped credential loading, and obsolete transaction-path removal. |
| Phase B final lint | `npm run lint` | 0 | Final lint gate passed with 0 errors and 226 warnings. |
| Phase B final typecheck | `npm run typecheck` | 0 | Final TypeScript gate passed with zero errors. |
| Phase B final test suite | `npm run test` | 0 | Final Vitest run passed: 48 files, 374 tests, zero failures. |

## S5 per-route service-role security matrix

Legend: `PASS` has an explicit session/role/cron boundary and an organization/location predicate (or an intentional minimal public contract). Former `S5-IDOR` rows name the `assertOrgOwnership` path that now closes them.

| Route | Methods | Boundary | Service-role scope / status |
|---|---|---|---|
| `/api/auth/locations` | GET | None | PASS — intentional pre-login safe location projection |
| `/api/auth/logout` | POST | Auth flow | PASS — authentication teardown only |
| `/api/auth/manager-verify` | POST | Session | PASS — organization predicate |
| `/api/auth/me` | GET | Optional session | PASS — signed session before database access |
| `/api/auth/pin-login` | POST | Auth flow | PASS — authentication entry; selected location determines organization |
| `/api/badges` | GET,POST | Session | PASS — organization predicate |
| `/api/badges/[id]` | GET,PATCH,DELETE | Session | PASS — organization predicate |
| `/api/badges/[id]/members` | POST,DELETE | Session | PASS — `assertOrgOwnership`: badge/customer `organization_id` |
| `/api/biotrack/config` | GET,POST,DELETE | Session | PASS — organization predicate |
| `/api/biotrack/generate-package-id` | POST | Session | PASS — location predicate / location-owned service |
| `/api/biotrack/inventory-sync` | POST | Cron secret | PASS — fail-closed bearer |
| `/api/biotrack/retry` | POST | Cron secret | PASS — fail-closed bearer |
| `/api/biotrack/status` | GET | Session | PASS — location predicate / location-owned service |
| `/api/brands` | GET,POST | Session | PASS — organization predicate |
| `/api/brands/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: brand `organization_id` |
| `/api/campaigns` | GET,POST | Session | PASS — organization predicate |
| `/api/campaigns/[id]` | GET,PATCH | Session | PASS — `assertOrgOwnership`: campaign `organization_id`; referenced template/segment/tag IDs checked |
| `/api/campaigns/[id]/analytics` | GET | Session | PASS — `assertOrgOwnership`: parent campaign `organization_id` |
| `/api/campaigns/[id]/recipients` | GET | Session | PASS — `assertOrgOwnership`: parent campaign `organization_id` |
| `/api/campaigns/[id]/schedule` | POST | Session | PASS — `assertOrgOwnership`: campaign `organization_id` |
| `/api/campaigns/[id]/send` | POST | Session | PASS — organization predicate |
| `/api/cart/config` | GET | Session | PASS — organization predicate |
| `/api/cash-drawers` | POST | Session | PASS — location predicate / location-owned service |
| `/api/categories` | GET,POST | Session | PASS — organization predicate |
| `/api/categories/[id]` | GET,PATCH,DELETE | Session | PASS — `assertOrgOwnership`: category/parent `organization_id` |
| `/api/customer-groups` | GET,POST | Session | PASS — organization predicate |
| `/api/customer-groups/[id]` | GET,PATCH | Session | PASS — organization predicate |
| `/api/customer-groups/[id]/members/bulk` | POST,DELETE | Session | PASS — `assertOrgOwnership`: group/customer `organization_id` |
| `/api/customers` | GET,POST | Session | PASS — organization predicate |
| `/api/customers/[id]` | GET,PATCH | Session | PASS — organization predicate |
| `/api/customers/[id]/badges` | GET,PATCH | Session | PASS — `assertOrgOwnership`: customer/badge `organization_id` |
| `/api/customers/[id]/groups` | PATCH | Session | PASS — `assertOrgOwnership`: customer/group `organization_id` |
| `/api/customers/[id]/loyalty/adjust` | POST | Session | PASS — organization predicate |
| `/api/customers/[id]/loyalty/history` | GET | Session | PASS — `assertOrgOwnership`: customer `organization_id` |
| `/api/customers/[id]/purchase-history` | GET | Session | PASS — location predicate / location-owned service |
| `/api/customers/[id]/transaction-history` | GET | Session | PASS — `assertOrgOwnership`: customer `organization_id` |
| `/api/customers/bulk` | PATCH | Session | PASS — organization predicate |
| `/api/customers/configure/badge-priority` | GET,PATCH | Session | PASS — organization predicate |
| `/api/customers/configure/doctors` | GET,POST | Session | PASS — organization predicate |
| `/api/customers/configure/doctors/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: doctor `organization_id` |
| `/api/customers/configure/fields` | GET,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/customers/configure/qualifying-conditions` | GET,POST | Session | PASS — organization predicate |
| `/api/customers/configure/qualifying-conditions/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: condition `organization_id` |
| `/api/customers/duplicates/merge` | POST | Session | PASS — organization predicate |
| `/api/customers/duplicates/scan` | POST | Session | PASS — organization predicate |
| `/api/customer-types` | GET | Session | PASS — authenticated non-resource handler |
| `/api/dashboard` | GET | Session | PASS — location predicate / location-owned service |
| `/api/delivery/check-address` | POST | None | PASS — intentional storefront eligibility check |
| `/api/delivery/config` | GET,PUT | Session | PASS — organization predicate |
| `/api/delivery/drivers` | GET,POST | Session | PASS — organization predicate |
| `/api/delivery/vehicles` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/delivery/zones` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/delivery/zones/[id]` | PATCH | Session | PASS — `assertOrgOwnership`: delivery-zone `organization_id` |
| `/api/discounts` | GET,POST | Session | PASS — organization predicate |
| `/api/discounts/[id]` | GET,PATCH,DELETE | Session | PASS — `assertOrgOwnership`: discount `organization_id` |
| `/api/discounts/[id]/duplicate` | POST | Session | PASS — `assertOrgOwnership`: source discount `organization_id` |
| `/api/drivers` | GET | Session | PASS — organization predicate |
| `/api/dutchie/cron` | GET,POST | Cron secret | PASS — fail-closed bearer |
| `/api/dutchie/jobs` | GET | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/dutchie/locations` | GET,POST | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/dutchie/sync` | POST | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/dutchie/sync/log` | GET | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/dutchie/test-connection` | POST | Dutchie role | PASS — manager/admin/owner + organization |
| `/api/employees` | GET,POST | Session | PASS — organization predicate |
| `/api/employees/[id]` | GET,PATCH,DELETE | Session | PASS — `assertOrgOwnership`: employee `organization_id` |
| `/api/employees/[id]/locations` | PUT | Session | PASS — location predicate / location-owned service |
| `/api/employees/[id]/permissions` | PUT | Session | PASS — `assertOrgOwnership`: employee/permission-group `organization_id` |
| `/api/employees/[id]/pin` | POST | Session | PASS — permission gate + `assertOrgOwnership`: employee `organization_id` |
| `/api/events` | GET,POST | Session | PASS — organization predicate |
| `/api/events/[id]` | PATCH | Session | PASS — `assertOrgOwnership`: event `organization_id` |
| `/api/fees-donations` | GET,POST,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/health` | GET | None | PASS — public liveness returns aggregate status only |
| `/api/inventory` | GET | Session | PASS — organization predicate |
| `/api/inventory/[id]/adjust` | POST | Session | PASS — permission gate + `assertOrgOwnership`: item `location_id` → session location/organization |
| `/api/inventory/[id]/move` | POST | Session | PASS — `assertOrgOwnership`: item/room/subroom bound to session location/organization |
| `/api/inventory/audits` | GET,POST | Session | PASS — organization predicate |
| `/api/inventory/audits/[id]` | GET,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/inventory/audits/[id]/items` | GET,POST | Session | PASS — `assertOrgOwnership`: audit location plus audit-item → audit parent binding |
| `/api/inventory/bulk` | PATCH | Session | PASS — organization predicate |
| `/api/inventory/check` | GET | Session | PASS — location predicate / location-owned service |
| `/api/inventory/combine` | POST | Session | PASS — organization predicate |
| `/api/inventory/convert` | POST | Session | PASS — organization predicate |
| `/api/inventory/destroy` | POST | Session | PASS — organization predicate |
| `/api/inventory/items/[id]` | GET,PATCH | Session | PASS — organization predicate |
| `/api/inventory/items/[id]/history` | GET | Session | PASS — `assertOrgOwnership`: item `location_id` → session location/organization |
| `/api/inventory/items/[id]/transactions` | GET | Session | PASS — `assertOrgOwnership`: item `location_id` → session location/organization |
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
| `/api/labels/templates/[id]` | GET,PATCH | Session | PASS — `assertOrgOwnership`: label-template `organization_id` |
| `/api/locations/[id]` | GET,PATCH | Session | PASS — `assertOrgOwnership`: location `organization_id` |
| `/api/locations/[id]/settings` | GET,PUT | Session | PASS — `assertOrgOwnership`: parent location `organization_id` |
| `/api/loyalty/adjust` | POST | Session | PASS — organization predicate |
| `/api/loyalty/adjustment-reasons` | GET,POST | Session | PASS — organization predicate |
| `/api/loyalty/config` | GET,PUT | Session | PASS — organization predicate |
| `/api/loyalty/tiers` | GET,POST | Session | PASS — organization predicate |
| `/api/loyalty/tiers/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: tier → loyalty-config → `organization_id` |
| `/api/manifests` | GET,POST | Session | PASS — organization predicate |
| `/api/manifests/[id]` | GET,PATCH,DELETE | Session | PASS — `assertOrgOwnership`: manifest `organization_id` |
| `/api/manifests/[id]/export` | GET | Session | PASS — `assertOrgOwnership`: parent manifest `organization_id` |
| `/api/manifests/[id]/history` | GET | Session | PASS — `assertOrgOwnership`: parent manifest `organization_id` |
| `/api/manifests/[id]/items` | POST | Session | PASS — `assertOrgOwnership`: manifest/product plus inventory-item location |
| `/api/manifests/[id]/items/[itemId]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: item → manifest parent, bound to URL manifest ID |
| `/api/manifests/[id]/receive` | POST | Session | PASS — `assertOrgOwnership`: manifest `organization_id` |
| `/api/manifests/[id]/reopen` | POST | Session | PASS — `assertOrgOwnership`: manifest `organization_id` |
| `/api/manifests/[id]/send` | POST | Session | PASS — `assertOrgOwnership`: manifest `organization_id` |
| `/api/manifests/export` | GET | Session | PASS — organization predicate |
| `/api/marketing-tags` | GET,POST | Session | PASS — organization predicate |
| `/api/orders` | POST,GET | Session | PASS — POST storefront create; GET session + organization join |
| `/api/orders/[id]` | GET,PATCH | Session | MIXED — public UUID-capability status GET; PATCH session + organization |
| `/api/orders/[id]/cancel` | POST | None | DEFERRED Phase B migration — public UUID capability needs a customer cancellation token |
| `/api/orders/expire` | POST | Cron secret | PASS — fail-closed bearer |
| `/api/permission-groups` | GET,POST | Session | PASS — organization predicate |
| `/api/permission-groups/[id]` | GET,PATCH,PUT | Session | PASS — `assertOrgOwnership`: permission-group `organization_id` |
| `/api/producers` | GET,POST | Session | PASS — organization predicate |
| `/api/producers/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: producer `organization_id` |
| `/api/product-kits` | GET,POST | Session | PASS — organization predicate |
| `/api/product-kits/[id]` | GET,PATCH,DELETE | Session | PASS — organization predicate |
| `/api/product-kits/[id]/items` | POST,DELETE | Session | PASS — organization predicate |
| `/api/products` | GET,POST | Session | PASS — organization predicate |
| `/api/products/[id]` | GET,PATCH,DELETE | Session | PASS — organization predicate |
| `/api/products/[id]/analytics` | GET | Session | PASS — `assertOrgOwnership`: product `organization_id` |
| `/api/products/[id]/images` | GET,POST,PATCH,PUT,DELETE | Session | PASS — `assertOrgOwnership`: product plus image → product parent/URL binding |
| `/api/products/[id]/label-settings` | GET,PUT | Session | PASS — `assertOrgOwnership`: product/label-template `organization_id` |
| `/api/products/[id]/price-history` | GET | Session | PASS — `assertOrgOwnership`: product `organization_id` |
| `/api/products/[id]/prices` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/products/[id]/tags` | GET,PUT | Session | PASS — `assertOrgOwnership`: product/tag `organization_id` |
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
| `/api/registers/[id]` | GET,PATCH,DELETE | Session | PASS — `assertOrgOwnership`: register bound to session location/organization |
| `/api/registers/configure/guestlist-entries` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/registers/configure/guestlist-entries/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: entry/status/register bound to session location; employee organization checked |
| `/api/registers/configure/guestlist-statuses` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/registers/configure/guestlist-statuses/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: status bound to session location/organization |
| `/api/registers/configure/order-sources` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/registers/configure/order-sources/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: source bound to session location/organization |
| `/api/registers/configure/settings` | GET,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/registers/configure/transaction-reasons` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/registers/configure/transaction-reasons/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: reason bound to session location/organization |
| `/api/registers/overview` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/closing` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/cogs` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/expiring` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/low-stock` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/sales-summary` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/schedules` | GET,POST | Session | PASS — organization predicate |
| `/api/reports/schedules/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: schedule `organization_id` |
| `/api/reports/schedules/execute` | POST | Cron secret | PASS — fail-closed bearer |
| `/api/reports/shrinkage` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/transactions` | GET | Session | PASS — location predicate / location-owned service |
| `/api/reports/transactions/[id]` | GET | Session | PASS — `assertOrgOwnership`: transaction bound to session location/organization |
| `/api/reports/valuation` | GET | Session | PASS — location predicate / location-owned service |
| `/api/rooms` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/rooms/[id]` | PATCH | Session | PASS — `assertOrgOwnership`: room bound to session location/organization |
| `/api/segments` | GET,POST | Session | PASS — organization predicate |
| `/api/segments/[id]` | GET,PATCH | Session | PASS — `assertOrgOwnership`: segment `organization_id` |
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
| `/api/settings/printers/[id]` | GET,PATCH,DELETE | Session | PASS — `assertOrgOwnership`: printer bound to session location/organization |
| `/api/settings/printers/[id]/assignments` | GET,POST,DELETE | Session | PASS — `assertOrgOwnership`: printer/register location plus assignment → printer parent |
| `/api/settings/print-service` | GET,PATCH | Session | PASS — location predicate / location-owned service |
| `/api/settings/product-fields` | GET,PUT | Session | PASS — location predicate / location-owned service |
| `/api/smart-tags` | GET,POST | Session | PASS — organization predicate |
| `/api/smart-tags/[id]` | PATCH,DELETE | Session | PASS — organization predicate |
| `/api/smart-tags/[id]/run` | POST | Session | PASS — organization predicate |
| `/api/smart-tags/run-all` | POST | Session | PASS — organization predicate |
| `/api/strains` | GET,POST | Session | PASS — organization predicate |
| `/api/strains/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: strain `organization_id` |
| `/api/tags` | GET,POST | Session | PASS — organization predicate |
| `/api/tags/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: tag `organization_id` |
| `/api/tax-rates` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/tax-rates/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: tax rate bound to session location/organization |
| `/api/templates` | GET,POST | Session | PASS — organization predicate |
| `/api/templates/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: campaign-template `organization_id` |
| `/api/templates/[id]/preview` | POST | Session | PASS — `assertOrgOwnership`: template/customer `organization_id` |
| `/api/terminal/drawer/close` | POST | Session | PASS — location predicate / location-owned service |
| `/api/terminal/queue` | GET,POST,PATCH,DELETE | Session | PASS — location predicate / location-owned service |
| `/api/terminal/receipt/[transactionId]` | GET | Session | PASS — location predicate / location-owned service |
| `/api/terminal/receipt/recent` | GET | Session | PASS — authenticated non-resource handler |
| `/api/time-clock` | GET,POST | Session | PASS — location predicate / location-owned service |
| `/api/transactions` | POST | Session | PASS — organization predicate |
| `/api/transactions/[id]/return` | POST | Session | PASS — organization predicate |
| `/api/transactions/[id]/void` | POST | Session | PASS — permission gate + `assertOrgOwnership`: transaction bound to session location/organization |
| `/api/vendors` | GET,POST | Session | PASS — organization predicate |
| `/api/vendors/[id]` | PATCH,DELETE | Session | PASS — `assertOrgOwnership`: vendor `organization_id` |
| `/api/workflows` | GET,POST | Session | PASS — organization predicate |
| `/api/workflows/[id]` | GET,PATCH | Session | PASS — `assertOrgOwnership`: workflow `organization_id` |
| `/api/workflows/[id]/executions` | GET | Session | PASS — `assertOrgOwnership`: parent workflow `organization_id` |

S5 inventory output: 231 route files inventoried (the matrix includes every `src/app/api/**/route.ts`, including the Phase A manual reconciliation route). All 65 formerly flagged dynamic route files are now `PASS`; `src/lib/auth/__tests__/ownership-matrix.test.ts` verifies every exported handler in those files contains the shared boundary.

## A2 route, fetch, response, and schema inventory output

Command: `node scripts/phase-a-inventory.mjs` (exit 0)

```text
PAGE_ROUTES=102
NAV_TARGETS=89
DEAD_NAV_TARGETS=0
API_ROUTES=231
CLIENT_FETCHES=395
DEAD_FETCH_TARGETS=0
RESPONSE_KEY_READS=314
RESPONSE_KEY_MISMATCHES=0
DB_WRITES=310
CONSTRAINED_LITERAL_WRITES=45
SCHEMA_LITERAL_VIOLATIONS=0
```

The DB-write count covers statically resolvable `.insert`/`.update`/`.upsert` chains. Literal CHECK values are validated against `.route/schema-constraints.json`; generated TypeScript types plus the A1 typecheck cover known NOT NULL/FK shapes. Dynamic payloads remain subject to their route validators and were manually reviewed where the inventory identified an API mismatch.

## Null-location render inventory

Inspected with the selected-location store unhydrated/null: `/dashboard`, `/delivery`, `/employees/time-clock`, `/inventory`, `/inventory/audits`, `/inventory/journal`, `/inventory/manifests`, `/inventory/purchase-orders`, `/inventory/receive`, `/inventory/receive-history`, `/inventory/transfers`, `/orders`, `/products`, `/registers`, `/reports/closing`, `/reports/cogs`, `/reports/inventory`, `/reports/reconciliation`, `/reports/sales`, `/reports/transactions`, `/settings/delivery`, `/settings/dutchie`, `/settings/labels`, `/settings/receipts`, `/settings/rooms`, `/settings/taxes`, and `/terminal/checkout`. No render-time non-null assertion or null property dereference remains; backoffice fetches omit `location_id` until selected and server routes fall back to the signed session location, while terminal checkout uses the signed session directly.

## Phase B — LIVE VERIFICATION (Fable, against real Dutchie data, dev DB)

Migration 20260402160000 applied via supabase db push (drift NOTICEs benign — IF NOT EXISTS guards worked).
Schema confirmed: dutchie_sync_state + dutchie_loyalty_staging created; current_points/points_change → NUMERIC; 7 RPCs present; dutchie_sync_state seeded 99 rows (96 location + 3 org-scoped); dutchie_sync_log +organization_id +heartbeat_at.

Loyalty pipeline driven with 50 REAL customer records from live /reporting/loyalty-snapshot (108,701 total):
- Match-rate guard: 50/50 (100%) via count_dutchie_loyalty_matches BEFORE apply.
- apply_dutchie_loyalty_chunk: 50 processed, 50 journaled, 0 unmatched.
- Decimal fidelity: all 50 current_points + lifetime_points EXACT to source cent (420253=295.10, 420184=2952.63, 420263=93.48).
- Idempotency: re-drain same run = 0 pending, no-op.
- Re-sync delta journaling: 420253 295.10→350.00 recorded points_change=+54.90 (delta, NOT absolute); 2 audit rows.
- adjust_loyalty_points (referral/manual path): 391.10 +25 = 416.10 relative, atomic, audit row written.
- All test artifacts cleaned up (0 balances/journal/staging remain).

Cron auth (src/lib/auth/cron.ts): fail-closed — missing CRON_SECRET → 500, wrong bearer → 401. 3/3 unit tests pass.
Cron full incremental live-run deferred: first real run does Apr→Jul catch-up; requires CRON_SECRET env var (currently unset). Incremental logic covered by unit tests.

Result: AC-B1, B11, B15 live-proven on real data. AC-B12 verified. AC-B8 (consecutive incremental) unit-tested; live run flagged for controlled first execution.

### Phase B review follow-up — F1 loyalty staging freshness

| ID | File:line | Class | Fix |
|---|---|---|---|
| B-F1 | `src/lib/dutchie/loyaltySync.ts:136` | Resumability / stale data | Defined one 20-hour cutoff per sync attempt. Cleanup now deletes complete/unapplied organization staging older than that cutoff in addition to the existing 24-hour incomplete cleanup. Both complete/unapplied resume lookups require `created_at >= cutoff` and order by `created_at DESC`, preventing old balances from being resumed while preserving recent staging-drain recovery. Match-rate-before-apply and checkpoint-only-after-full-drain code paths were not moved or changed. |
| B-F1-T | `src/lib/dutchie/__tests__/loyaltyResume.test.ts:201` | Regression tests | Added an in-memory Supabase query-double test proving a one-hour-old complete/unapplied run resumes with zero Dutchie snapshot calls, while a 21-hour-old run is purged and exactly one fresh snapshot is fetched. TDD RED: stale case expected one fetch but observed zero; GREEN: 2/2 focused tests passed. |

Verification: `npx vitest run src/lib/dutchie src/lib/services/__tests__/loyaltyAdjustmentAtomic.test.ts src/app/api/dutchie src/app/api/settings/dutchie-config` exited 0 (10 files, 34/34 tests); `npm run typecheck` exited 0.

## Phase C — Universal theme system

### Findings and implementation ledger

| ID | File:line | Class | Fix / decision |
|---|---|---|---|
| C-001 | `src/app/globals.css:1` | Token architecture | Replaced the browser-preference two-color stylesheet with three explicit semantic themes. `:root` and `oasis-dark` are the default near-black/emerald presentation; `oasis-light` uses warm neutral surfaces; `oasis-contrast` raises text/edge separation. Surface, edge, text, brand, status/soft, chart, ring, radius, and shadow groups are mapped into Tailwind v4 through `@theme inline`. |
| C-002 | `src/lib/theme/registry.ts:1` | Extensibility | Added `THEMES` as the sole TypeScript theme inventory plus derived `ThemeId`, default, persistence keys, and validation. Provider and picker import this registry; neither contains per-theme branching. |
| C-003 | `src/lib/theme/bootstrap.tsx:1`; `src/app/layout.tsx:1` | No FOUC | Added an inline parser-blocking head script before `<body>`. It validates localStorage/cookie values against registry-derived IDs and sets `document.documentElement.dataset.theme` before paint. Blocked storage access falls through to cookie/default without delaying paint. The root defaults to `oasis-dark` and suppresses only the expected hydration attribute difference. |
| C-004 | `src/lib/theme/ThemeProvider.tsx:1` | Persistence | Added a registry-validated external-store provider. Theme changes update the root dataset, localStorage when available, a one-year SameSite=Lax cookie, and an in-page subscription event; storage events synchronize valid selections across tabs. |
| C-005 | `src/components/theme/ThemePicker.tsx:1`; `src/app/(backoffice)/settings/appearance/page.tsx:1` | Appearance UI | Added registry-rendered GitHub-style miniature interface previews with radio semantics, visible selection state, and an Appearance settings route. Added Appearance to the settings landing page and sidebar. |
| C-006 | `src/components/shared/*.tsx:1`; `src/components/backoffice/KPICard.tsx:1` | Shared UI | Converted existing shared controls to semantic utilities and added semantic Button, Input, Select, Card, Modal, StatCard, Badge, Switch, and Tabs primitives. `KPICard` now delegates to `StatCard`; pages were not individually redesigned. |
| C-007 | `scripts/codemod-theme.mjs:1`; `src/app/**`; `src/components/**` | Palette removal | Mechanically converted numbered gray/zinc/slate/neutral/stone/red/green/emerald/blue/amber/purple and black/white utilities in 157 files to role-based utilities. The follow-up scan reports zero numbered palette utilities. |
| C-008 | `.route/theme-exemptions.txt:1` | Literal-color exceptions | Documented seven narrowly scoped files containing user-persisted color values, native color-input defaults, or black-on-white thermal print output. Exemptions apply only to hex scanning; palette utilities remain forbidden even in exempt files. |
| C-009 | `src/components/backoffice/charts/SalesByCategoryChart.tsx:14`; `SalesByHourChart.tsx:19`; `SalesTrendChart.tsx:14` | Chart theming | Replaced Recharts hex literals with `--chart-*`, surface, edge, and text variables so charts react immediately to the selected theme. |
| C-010 | `scripts/check-theme.mjs:1`; `package.json:13` | Regression gate | Added `npm run check:theme`. It recursively scans 441 files, rejects forbidden palette utilities and non-exempt hex, validates exemption paths, computes contrast from shipped CSS, and fails below WCAG AA 4.5:1. |
| C-011 | `src/lib/theme/__tests__/theme-contract.test.ts:1` | Contract tests | Added AC-C3 registry/CSS-block/provider/picker assertions and a no-FOUC source-order/persistence test. Initial RED: 3/3 failed before implementation; final targeted run: 3/3 passed. |
| C-012 | `src/components/shared/__tests__/shared.test.tsx:99` | Semantic test repair | The shared cluster exposed an obsolete emerald-class assertion and showed success badges had inherited the accent role. Changed `StatusBadge` to success/warning/danger/info soft pairs and asserted semantic success tokens. Targeted component/theme run: 43/43 passed. |

### WCAG AA computed contrast results

Command: `npm run check:theme` (exit 0). Normal-text threshold: 4.50:1. The gate checks each normal text role on every general surface, inverse text on all strong status fills, accent foreground, and status text on its soft surface.

```text
oasis-dark: text-primary/bg=17.80, text-primary/surface=16.75, text-primary/surface-raised=15.38, text-primary/surface-overlay=13.89, text-secondary/bg=11.92, text-secondary/surface=11.22, text-secondary/surface-raised=10.30, text-secondary/surface-overlay=9.30, text-muted/bg=7.32, text-muted/surface=6.89, text-muted/surface-raised=6.32, text-muted/surface-overlay=5.71, text-inverse/success=11.06, text-inverse/warning=11.54, text-inverse/danger=7.16, text-inverse/info=7.58, accent-fg/accent=8.41, success/success-soft=7.09, warning/warning-soft=7.33, danger/danger-soft=5.40, info/info-soft=5.31
oasis-light: text-primary/bg=15.30, text-primary/surface=16.13, text-primary/surface-raised=14.69, text-primary/surface-overlay=13.86, text-secondary/bg=7.76, text-secondary/surface=8.19, text-secondary/surface-raised=7.46, text-secondary/surface-overlay=7.03, text-muted/bg=5.21, text-muted/surface=5.50, text-muted/surface-raised=5.01, text-muted/surface-overlay=4.72, text-inverse/success=6.77, text-inverse/warning=6.73, text-inverse/danger=5.97, text-inverse/info=6.36, accent-fg/accent=5.39, success/success-soft=6.49, warning/warning-soft=6.37, danger/danger-soft=5.24, info/info-soft=5.49
oasis-contrast: text-primary/bg=19.94, text-primary/surface=19.26, text-primary/surface-raised=18.01, text-primary/surface-overlay=16.36, text-secondary/bg=16.22, text-secondary/surface=15.67, text-secondary/surface-raised=14.65, text-secondary/surface-overlay=13.31, text-muted/bg=11.53, text-muted/surface=11.14, text-muted/surface-raised=10.41, text-muted/surface-overlay=9.46, text-inverse/success=12.74, text-inverse/warning=14.73, text-inverse/danger=10.27, text-inverse/info=10.77, accent-fg/accent=10.10, success/success-soft=8.11, warning/warning-soft=8.78, danger/danger-soft=7.69, info/info-soft=7.48
```

The lowest shipped pairing is Oasis Light muted text on the overlay surface at 4.72:1. The gate initially caught that pair below threshold; `--text-muted` was adjusted before completion.

### Supplemental release checks

- `npm run lint`: exit 0, 0 errors (226 pre-existing warnings).
- `npm run build`: exit 1 before application compilation because the restricted environment could not fetch the pre-existing `Geist` and `Geist Mono` Google font CSS. It also reported pre-existing `next.config.ts` stale-time/API warnings and the middleware deprecation. No Phase C compile error was emitted.
- `npm audit --audit-level=moderate`: exit 1 because the restricted environment could not reach the npm advisory endpoint; no dependency changes were made in Phase C.
- Security scan: no Phase C secret, credential, privileged SQL, or runtime debug path was introduced. The three new `console.log` matches are intentional output from the CLI-only `check-theme.mjs` gate.

### Phase C final verification — 2026-07-14

| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck` | 0 | PASS — TypeScript emitted no errors. |
| `npm run test` | 0 | PASS — 49 files, 377/377 tests. |
| `npm run check:theme` | 0 | PASS — 441 files scanned, 7 documented exemptions, all computed pairs >= 4.50:1. |

Final trio rerun after blocked-storage/cross-tab persistence hardening: `typecheck=0`, `test=0` (377/377), `check:theme=0`.

## Redesign v2 — High-contrast utilitarian

### Findings and implementation ledger

| ID | File:line | Class | Fix / decision |
|---|---|---|---|
| R2-001 | `src/app/globals.css:3` | Theme tokens / visual hierarchy | Retuned `oasis-dark` to the approved stepped near-black surfaces (`#0a0f0d` → `#141c19` → `#1c2723` → `#243430`), brighter text, crisp edge roles, vivid emerald accent/status colors, smaller radii, and minimal shadows. Retuned `oasis-light` and `oasis-contrast` with the same stepped-surface, crisp-edge intent while preserving the existing semantic properties and Tailwind v4 mappings. The registry/provider architecture was not changed. |
| R2-002 | `src/components/shared/StatCard.tsx:14`; `src/components/backoffice/KPICard.tsx:14` | KPI information design | Rebuilt the KPI primitive as a dense bordered card with a 1px top accent hairline, uppercase 11px micro-label and 14px icon, 22px tabular value, optional detail, and compact directional delta chip. Delta UI renders only for an actual finite delta value; no comparison data is inferred or fabricated. `KPICard` delegates to this shared primitive. |
| R2-003 | `src/app/(backoffice)/dashboard/page.tsx:5` | Dashboard KPI wiring | Wired distinct Lucide icons to all five dashboard KPIs: transactions, gross sales, net sales, customers, and average cart. The current dashboard response has no prior-period delta fields, so the optional trend chips are intentionally absent until real delta data exists. This was the only individual page restyled. |
| R2-004 | `src/components/shared/DataTable.tsx:101` | Dense data display | Tightened table typography and spacing to 36px rows / `py-1.5`, added crisp `border-edge` row dividers, a sticky uppercase 11px `bg-raised` header with strong divider, raised-surface hover feedback, and automatic tabular numerals for right-aligned numeric columns. Search, pagination, empty, and loading states remain shared and theme-aware. |
| R2-005 | `src/components/shared/Card.tsx:11`; `Button.tsx:18`; `Input.tsx:13`; `Select.tsx:14`; `SearchableSelect.tsx:49`; `MoneyInput.tsx:33`; `DateRangePicker.tsx:51` | Shared primitives | Tightened cards, buttons, text inputs, selects, searchable selects, money fields, and date controls to compact heights, `rounded-sm`, visible semantic borders, dense 13px type, and crisp focus rings. Added the shared uppercase micro-heading `CardHeader` variant. Pages inherit these changes through their existing shared components. |
| R2-006 | `src/components/backoffice/Sidebar.tsx:79`; `BackofficeHeader.tsx:14`; `LocationSwitcher.tsx:20` | Application shell | Reduced sidebar navigation and header controls to the specified compact dimensions, strengthened shell edges, and changed active navigation to `bg-accent-soft` plus a precise 2px emerald left indicator. Location switching remains functionally unchanged and now matches the dense header treatment. |
| R2-007 | `src/components/shared/__tests__/redesign-v2.test.tsx:24` | Regression tests | Added a shared-component contract covering stat typography/real-delta behavior, dense sticky tables and numeric columns, compact controls, exact dark surface tokens, small-radius tokens, sidebar active indicator, compact header, and preservation of the theme registry architecture. TDD RED: 4/4 expectations initially failed; GREEN: the focused shared/layout/theme run passed 26/26. |

### WCAG AA contrast after Redesign v2

`npm run check:theme` recomputed every shipped normal-text pairing at the 4.50:1 threshold. All three themes pass. The lowest pairing is Oasis Light muted text on the overlay surface at **4.56:1**; Oasis Dark's lowest normal-text pairing is **5.36:1**, and Oasis Contrast's is **6.67:1**.

```text
oasis-dark: primary surfaces=18.47/16.59/14.72/12.48; secondary=13.46/12.09/10.73/9.09; muted=8.50/7.64/6.78/5.74; accent=10.14; status-soft minimum=5.36
oasis-light: primary surfaces=15.33/17.59/14.42/13.15; secondary=9.17/10.53/8.63/7.87; muted=5.32/6.10/5.00/4.56; accent=5.30; status-soft minimum=5.04
oasis-contrast: primary surfaces=20.25/18.42/15.74/12.03; secondary=17.53/15.95/13.62/10.42; muted=12.51/11.38/9.72/7.43; accent=12.12; status-soft minimum=6.67
```

### Supplemental verification

- `npm run lint`: exit 0, **0 errors** (224 existing warnings).
- Focused Vitest + type/theme cluster: exit 0, **26/26 tests**, typecheck 0, theme gate 0.
- Changed-file security scan: no secret, credential, debug logging, unsafe HTML injection, or new runtime environment access found.
- `npm run build`: exit 1 at the external font-fetch stage because this restricted environment could not reach the pre-existing Google-hosted `Geist` and `Geist Mono` CSS. Next emitted no redesign compilation error before that environmental failure; existing `next.config.ts` option and middleware deprecation warnings remain outside this redesign.
- `npm audit --audit-level=moderate`: exit 1 because the restricted environment could not reach npm's advisory endpoint. This redesign added no dependencies.

### Redesign v2 final verification — 2026-07-14

| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck` | 0 | PASS — TypeScript emitted no errors. |
| `npm run test` | 0 | PASS — 51 files, 383/383 tests. |
| `npm run check:theme` | 0 | PASS — 442 files scanned, 7 documented exemptions, all computed pairs >= 4.50:1. |

## Redesign v2 — density pass

### Findings and implementation ledger

| ID | File:line | Class | Fix / decision |
|---|---|---|---|
| R2-D01 | `src/lib/constants/tableDensity.ts:1` | Bespoke table consistency | Added one page-style constant for inline backoffice tables without changing the shared `DataTable` or theme tokens. It enforces 40px rows, `py-2` maximum cell padding, middle alignment, 13px single-line cells, crisp `border-edge` dividers, `bg-raised/50` hover, and 11px uppercase muted raised headers. A sticky variant is used only by horizontally scrollable tables. |
| R2-D02 | `src/app/(backoffice)/**/page.tsx` | List-page density audit | Audited every inline backoffice table. Applied the compact contract to 34 tables across 31 list/report/settings pages, including customers, inventory, products, employees, orders, inventory audits/journal/manifests/purchase orders/transfers, customer configuration lists, delivery, marketing lists, reports, and tabular settings pages. Dynamic detail-page sub-tables and already-compact inline tables were left unchanged. Existing columns, fetches, links, badges, selections, pagination, and row actions were preserved. |
| R2-D03 | `src/app/(backoffice)/customers/page.tsx:447`; `inventory/page.tsx:1093`; `products/page.tsx:937`; `employees/page.tsx:55`; `orders/page.tsx:66` | Long-value wrapping | Added bounded single-line truncation plus native `title` disclosure to names, emails, notes, products, brands, categories, vendors, strains, package/batch identifiers, permission groups, and order customer names. Product thumbnails were reduced to 24px and product tags now stay in one clipped, titled strip, keeping populated rows near 40px without removing data or actions. Audit scope lists and journal reasons received the same treatment. |
| R2-D04 | `src/components/shared/__tests__/redesign-v2.test.tsx:127` | Regression coverage | Added a source contract that inventories the 31 audited pages, requires every inline table to opt into compact density, and verifies the shared row/header/nowrap/divider/hover utilities. TDD RED failed on the first unconverted customer table; GREEN passed 5/5 focused tests. Updated the pre-existing token assertion to the already-shipped dark surface values (`#19221e`, `#24312c`, `#486054`) without modifying any token. |

### Supplemental verification

- `npm run lint`: exit 0, **0 errors** (224 existing warnings).
- Changed-file security scan: no secret, credential, debug logging, unsafe HTML injection, privileged SQL, or runtime environment access was introduced.
- `npm run build`: exit 1 only because the restricted environment could not fetch the pre-existing Google-hosted `Geist` and `Geist Mono` CSS. Next emitted no application compile error before the external font failure; existing `next.config.ts` and middleware warnings remain outside this density pass.
- `npm audit --audit-level=moderate`: exit 1 because the restricted environment could not reach npm's advisory endpoint. No dependency was added or changed.

### Redesign v2 density pass final verification — 2026-07-14

| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck` | 0 | PASS — TypeScript emitted no errors. |
| `npm run test` | 0 | PASS — 51 files, 384/384 tests. |
| `npm run check:theme` | 0 | PASS — 442 files scanned, 7 documented exemptions, all computed pairs >= 4.50:1. |
