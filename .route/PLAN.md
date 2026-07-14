# PLAN v3: Full-Stack Audit + Dutchie Sync Hardening + Universal Theme System

Branch: `route/full-audit-sync-theme`. v2 incorporated all 22 round-1 findings + Phase B3 (cron). v3 resolves round-2's 2 blockers + 5 majors (`.route/plan-review-2.txt`): atomic loyalty reconciliation via RPC, durable staging-table resume, org-scoped sync state, fail-closed cron auth, window-granular checkpoints, org-vs-location entity classification, settings-route authz.

## Assumptions (hands-off run)

1. A1: Uncommitted Apr 2 work committed as baseline (working code already live on dev DB).
2. A2: Audit findings are FIXED, not just reported.
3. A3: "Whole new UI design" = universal token system + restyled shared components + refreshed chrome; default stays dark+emerald; light theme + contrast theme prove switchability. NOT 102 bespoke page redesigns.
4. A4: Loyalty source: `GET /reporting/loyalty-snapshot` (live-verified: 108,663 records, decimals, rate-limit 1/min, nightly refresh).
5. A5: Dev DB `nlyrqgosspjefrkhupja` only. Sol writes migration FILES; Fable applies via MCP and live-verifies.
6. A6: **Loyalty system-of-record policy (bridge period): Dutchie is authoritative.** Oasis-local loyalty mutations during the bridge are reconciled to snapshot values on each loyalty sync; every applied change is journaled into `loyalty_transactions` (auditable). Loyalty sync is org-scoped, run at most once/day via ONE designated location key (first enabled location alphabetically — stable). At Dutchie cutover, `sync_loyalty` toggle turns the overwrite off permanently. This policy is documented in code comments + AUDIT.md.
7. A7: e2e (Playwright against a running server) stays OUT of the automated gates (no seeded ephemeral DB available); compensated by unit/integration tests with mocked fetch + Fable's live verification on dev.

## Out of scope (Sol must NOT touch)

- BioTrack logic beyond objectively-broken fixes. `.env*`, staging/prod DBs. No new deps without a finding requiring one. No page-level IA redesigns.
- At-rest encryption of `dutchie_config.api_key_encrypted` (documented follow-up; bridge-period accepted risk — table is service-role-only). But: key must NEVER reach any client response (verify+fix in A-SEC), and raw-response logging of PII is removed.

## Verified facts (Sol: trust over Swagger/docs)

- Auth: `Authorization: Basic base64(apiKey + ':')`
- Transactions: `GET /reporting/transactions` — FromDateUTC/ToDateUTC (chunk ≤55d), IncludeDetail, IncludeTaxes
- Customers: `GET /customer/customers-paginated` — PageNumber/PageSize(≤1000), fromLastModifiedDateUTC
- Products: `GET /products` — full pull, supports fromLastModifiedDateUTC
- Inventory: `GET /reporting/inventory` — Skip/Take(≤5000). Employees: `GET /employees` (userId/fullName/status/groups)
- Loyalty: `GET /reporting/loyalty-snapshot` — no params → `[{customerId:int, loyaltyBalance:dbl, loyaltySpent:dbl, loyaltyEarned:dbl}]`
- Dev DB verified: `loyalty_balances(current_points INT, lifetime_points INT, enrolled_at now() default, UNIQUE(customer_id,organization_id))`, `customers.dutchie_customer_id INT`. NOTE: some of this exists on dev but NOT in migration files (drift) — migrations must be defensive (IF NOT EXISTS / conditional ALTER).
- Fable will dump live constraint introspection to `.route/schema-constraints.json` — THAT is the schema authority for Phase A conformance, not DATABASE-CONSTRAINTS.md (supplementary only; it covers 46 of ~101 tables).
- Supabase: 1000-row page cap, real UNIQUE needed for upsert, dedupe conflict keys per batch, `NOTIFY pgrst, 'reload schema'`.

---

## Phase A — Site-wide audit & fix

### A-SEC (from review — do FIRST)
- S1: `requireSession` location override: validate the `oasis-location-id` cookie value is a location belonging to the session's organization AND (employee is assigned via `employee_locations` OR role ∈ {admin,owner}). Reject otherwise (fall back to session's own location). Add unit tests incl. negative (foreign-org location id → rejected).
- S2: Dutchie routes (`/api/dutchie/*`) AND `/api/settings/dutchie-config` AND the connection-test endpoint: require role ∈ {manager, admin, owner}. Org-scope every query (config lookups filter by session organization via the locations table join, not location id alone).
- S6: ALL cron routes fail CLOSED: `/api/dutchie/cron` (new) + existing `/api/biotrack/retry`, `/api/biotrack/inventory-sync`, `/api/orders/expire`, `/api/reconciliation`, `/api/reports/schedules/execute` — if `CRON_SECRET` is unset/empty → 500 refusal (never allow); wrong/missing bearer → 401. Unit-test all three cases on the new route; apply the same guard helper to the existing routes.
- S3: Remove/neuter `logRawResponse` raw PII sampling in `client.ts` (log counts + ids only). Grep for other logger calls emitting raw customer/employee records; redact.
- S4: Verify `api_key_encrypted` never appears in any API response payload (settings API must return only a boolean `hasApiKey` + masked tail); fix if it leaks.
- S5: All other `/api/*` routes: spot-audit that session org/location scoping exists on service-role queries (record per-route status in AUDIT.md matrix).

### A1 Baseline gate repair (measured: 52 TS errors, lint failing, 1 failing test of 323)
- Clusters: badge-priority TS2322s; inventory InvItem missing thc/cbd_percentage; dutchie settings TS2345; API TS2769 upsert overloads (regenerate `src/types/database.ts` from dev via CLI if it resolves cleanly, else targeted casts); `v1Client.ts` TS1501 (bump tsconfig target/lib ≥ es2018; verify no downstream fallout); taxCalculator test TS18048s; the 1 failing test — fix ROOT CAUSE; lint setState-in-effect violations (restructure, don't suppress; eslint-disable with justification comment only where restructure is genuinely wrong).
- Pre-identified: `referralService.ts:64,77` NaN-write (missing loyalty row → `undefined + n`); fix with guarded upsert.

### A2 Broken links/APIs/UI/edge cases (methodology scoped to statically-resolvable patterns)
- Inventory ALL of: `href=`, `router.push|replace(`, `redirect(`, `window.location`, `<Link>` targets with template literals whose static base is resolvable → verify against real route set; fix dead targets.
- All client `fetch('/api/…')` (incl. template literals with static bases) → matching route.ts + exported method + consuming code reads actual response keys (known class: `json.data` vs named keys).
- DB writes conformance vs `.route/schema-constraints.json` (CHECK values, NOT NULLs, FK existence).
- UI dead-ends: no-op handlers, unclosable modals, dropdown clipping, HTML entity corruption, unguarded `.toFixed()`/date parses, null `locationId` crashes, `.map` without empty state on list pages.
- Sync History DATE column `--` bug: fix field mapping; render Mountain time.

Acceptance criteria:
- AC-A1: `.route/AUDIT.md` = complete findings ledger (id, file:line, class, fix commit) + per-route security matrix (S5). Anything unfixed carries explicit reason.
- AC-A2: Statically-resolvable nav targets (patterns enumerated above) all resolve; inventory script + zero-dead-target output included in AUDIT.md.
- AC-A3: Same for fetch targets incl. method + response-key conformance.
- AC-A4: Zero DB-write payloads violating live-introspected constraints.
- AC-A5: Sync History dates render (Mountain).
- AC-A6: Null-location: terminal + backoffice top-level pages render without crash with no location cookie (enumerated route list in AUDIT.md).
- AC-A7: typecheck = 0 errors. AC-A8: tests 100% pass. AC-A9: lint exit 0.
- AC-A10 (S1/S2): negative authz tests pass — foreign-org location cookie rejected; non-manager blocked from dutchie routes.

## Phase B — Dutchie sync: hardening + loyalty + cron

### B1 Loyalty sync (org-scoped, atomic, durably resumable, no-retry)
- Migration `*_dutchie_loyalty_sync.sql` (defensive, IF NOT EXISTS style):
  1. Widen `loyalty_balances.current_points`+`lifetime_points` → `NUMERIC(12,2)`; ensure UNIQUE(customer_id,organization_id); **audit + update ALL dependent SQL functions** (`create_sale_transaction` p_loyalty_points/v_balance_after, void/return fns) to NUMERIC(12,2); widen `loyalty_transactions` points columns to match.
  2. NEW TABLE `dutchie_sync_state` (organization_id UUID NOT NULL, location_id UUID NULL, entity_type TEXT NOT NULL, last_synced_at TIMESTAMPTZ, cursor JSONB NULL, is_enabled BOOLEAN NOT NULL DEFAULT TRUE, designated_location_id UUID NULL, unique index on (organization_id, entity_type, COALESCE(location_id,'00000000-0000-0000-0000-000000000000'))) — org-wide rows (location_id NULL: reference, customers, loyalty) AND per-location cursor rows (transactions window cursors etc.) in one durable schema (round-3 major #4).
  3. NEW TABLE `dutchie_loyalty_staging` (id BIGINT GENERATED, organization_id UUID, run_id UUID NOT NULL, run_fingerprint TEXT NOT NULL, dutchie_customer_id INT, balance NUMERIC(12,2), earned NUMERIC(12,2), spent NUMERIC(12,2), applied_at TIMESTAMPTZ NULL, UNIQUE(organization_id, run_id, dutchie_customer_id)). `run_fingerprint` = count + hash over canonically-sorted (customerId,balance,earned,spent) tuples — value changes produce a new fingerprint (round-3 blocker #1). `run_id` (UUID) is the journal idempotency key, distinct from the fingerprint.
  4. NEW RPC `apply_dutchie_loyalty_chunk(p_org UUID, p_run UUID, p_limit INT)`: single transaction — selects next unapplied staging rows, resolves customers, row-locks `loyalty_balances` FOR UPDATE (race-safe INSERT ... ON CONFLICT for missing rows), computes delta vs CURRENT value, updates balances, journals idempotently (ON CONFLICT DO NOTHING keyed by (customer_id, run_id) reference), marks staging applied, returns counts.
  5. NEW RPC `adjust_loyalty_points(p_customer UUID, p_org UUID, p_delta NUMERIC, p_reason ...)` — atomic relative-delta writer (`UPDATE ... SET current_points = current_points + delta`, race-safe row creation, journal row) (round-3 blocker #2). **ALL existing loyalty writers migrate to it**: `loyaltyAdjustmentService`, `referralService` (kills the NaN bug), `customers/[id]/loyalty/adjust` route, duplicate-merge route. Grep gate: no read-then-write of `current_points` outside SQL functions.
  6. `NOTIFY pgrst, 'reload schema'`.
- Client: dedicated `getLoyaltySnapshot()` — exactly ONE HTTP attempt (no retry wrapper/Retry-After loop).
- Engine `syncLoyalty` (org-level, runs under `(organization_id,'loyalty')` lock): validate response (non-empty, schema-valid) → compute value-sensitive run_fingerprint → **match-rate guard BEFORE any application** (round-3 major #3: one join query staging↔customers; matched/total < 30% → mark failed, apply nothing, keep checkpoint) → bulk-insert staging under a new run_id (same fingerprint found unapplied → resume that run_id instead) → drain via RPC chunks until done or deadline (unapplied staging rows = durable cursor) → on full drain update `dutchie_sync_state.last_synced_at`, purge applied rows >7 days old.
- `enrolled_at` never in payloads (DB default; existing preserved — tested).
- Config/UI: loyalty tile in settings dutchie page reads org state (toggle=is_enabled, last-synced, designated location selector, sync button), `loyalty` in VALID_ENTITY_TYPES.

### B2 Engine quality
- **Entity scope classification** (round-2 #6, corrected round-3 #5): org-wide = reference (brands/strains/vendors/categories/tags/tiers), customers, loyalty → ONE work item per org (designated credential), lock (organization_id, entity_type). Location-scoped = products, employees, inventory, rooms, transactions, registers — products/employees stay per-location because their sync writes per-location projections (`location_product_prices`, `employee_locations`); incremental params keep repeat pulls small; org-level catalog upserts are idempotent across locations.
- **DB-backed single-flight**: `dutchie_sync_log` gains `organization_id`; two partial unique indexes: `(organization_id, entity_type) WHERE status='running'` for org-wide entities and `(location_id, entity_type) WHERE status='running'` for location-scoped; + `heartbeat_at` updated per batch; acquisition = INSERT (conflict → 409); stale lease (heartbeat > 5 min) reaped as 'failed: stale' by next acquirer — reaper must NOT destroy loyalty staging cursor (fingerprint survives in staging table, not the log row). Kill-mid-run recovery test.
- Fix `ENTITY_ENABLED_KEY` transactions→syncInventory bug; add `sync_transactions BOOLEAN NOT NULL DEFAULT TRUE` + ensure `last_synced_transactions_at` exists in MIGRATION (drift repair); enumerate every mapping: migration column ↔ configLoader ↔ settings API schema ↔ settings UI state ↔ engine gate. All toggles round-trip.
- Checkpoint semantics: advance `last_synced_*` ONLY after fully-successful run (zero batch failures); always overlap 15 min on next incremental; zero-fetch success DOES advance. **Transactions: window-granular durable progress** (round-2 major #5) — each completed 55-day window persists a window cursor (in org/location sync state JSONB) so a deadline-stop or crash never re-pulls completed windows; authoritative `last_synced_transactions_at` advances only when all windows complete. Deadline is passed INTO pagination/window loops (clean stop between pages/windows), not only checked between entities.
- Batch failure isolation: on batch upsert error → bisect (halve until offender isolated), quarantine offender into sync_log error_details, persist the rest; counters accurate. Unit test: 1 poisoned record in 1000 → 999 persist.
- Transactions atomicity: replace delete-then-reinsert payments with order that cannot strand a header (insert new rows with new txn version before deleting old, or move the pair into a single RPC — choose based on existing code shape); window boundaries exclusive-end to prevent double-day overlap.
- No per-record awaited queries in loops (batch lookups).

### B3 Scheduled incremental cron (4x daily until Dutchie cutover)
- `GET/POST /api/dutchie/cron` — Bearer `CRON_SECRET`, **fail-closed** (S6): unset secret → 500 refuse; bad/missing header → 401. No session.
- Work queue = one item per (org × org-wide entity) + one per (enabled location × location-scoped entity), ordered least-recently-synced first; INCREMENTAL only: customers/products via fromLastModifiedDateUTC(-15min); transactions from window cursor (55d chunks, window-granular durable progress); inventory/employees/rooms/reference full-fetch-upsert (no incremental API) — any entity with null checkpoint is SKIPPED ("needs initial manual sync" in response) so cron never full-pulls history.
- Loyalty: only when org `last_synced_at` null-or->20h; drains any pending staging cursor first.
- `vercel.json`: crons 12:00,18:00,23:00,04:00 UTC (≈6a,12p,5p,10p Mountain); `maxDuration: 300` for `/api/dutchie/*`; deadline (~250s) threads into entity loops (window/page granular stops); because progress is durable per work item, a starved item RESUMES mid-entity next run — no starvation loop (round-2 major #5). Vercel does not retry failed cron runs — the durable cursors are the recovery mechanism.
- Local test: curl with CRON_SECRET (Fable live-verifies incremental behavior: consecutive-run records_fetched << full counts).

Acceptance criteria:
- AC-B1: Loyalty end-to-end on dev (Fable-verified): decimals preserved, enrolled_at untouched on resync, deltas journaled, unmatched counted, match-rate guard active.
- AC-B2: Loyalty tile in UI with working toggle/button/timestamp.
- AC-B3: All entity toggles (incl. new sync_transactions, sync_loyalty) round-trip UI→API→DB→reload; ENTITY_ENABLED_KEY correct per entity (unit test).
- AC-B4: Checkpoint tests: advance on success, hold on partial failure, 15-min overlap applied, zero-fetch advances.
- AC-B5: Kill-mid-run leaves recoverable state: stale lease reaped on next run; no permanent 'running' rows (test simulates orphan).
- AC-B6: Concurrent same-location+entity sync → second gets 409 via DB constraint (test).
- AC-B7: Cron route: incremental-only, skips virgin entities, loyalty ≤1/day, time-budget handoff, vercel.json schedule 4x daily.
- AC-B8: Two consecutive live cron runs on dev: second run's records_fetched << first (Fable-verified).
- AC-B9: Poisoned-batch isolation test passes (999/1000 persist, offender quarantined).
- AC-B10: Migration applies cleanly on dev via MCP AND on a schema built from migration files alone (drift-defensive).
- AC-B11: Loyalty atomicity: concurrent local adjustment during a sync drain cannot be lost or double-journaled (RPC row-lock test); kill-mid-drain resumes from staging cursor with same fingerprint and completes with correct totals.
- AC-B12: Cron auth 3-case test: no secret configured → refused; wrong bearer → 401; correct bearer → 200. Existing cron routes use the same fail-closed guard.
- AC-B13: Org-wide entities (reference, customers, loyalty) produce exactly ONE work item per org per cron run; lock keyed (organization_id, entity_type) proves 409 on concurrent org-wide sync.
- AC-B14: Zero read-then-write mutations of `current_points` outside SQL functions (grep gate); adjust/referral/merge flows all route through `adjust_loyalty_points` RPC with passing unit tests.
- AC-B15: Match-rate guard fires BEFORE any balance mutation (test: low-match staging → zero balance changes).

## Phase C — Universal theme system

Architecture (unchanged from v1) + review fixes:
- Token layer in `globals.css` (`:root` = oasis-dark default; `[data-theme="oasis-light"]`, `[data-theme="oasis-contrast"]`): surfaces (bg/surface/raised/overlay), edges, text (primary/secondary/muted/inverse), accent set, status set (+soft), `--chart-1..6`, `--ring`, radii, shadows. Tailwind v4 `@theme inline` maps to utilities (`bg-surface`, `text-muted`, `border-edge`, `bg-accent`…).
- **Theme registry** (review #20): single `src/lib/theme/registry.ts` exporting `THEMES = [{id,label}]`; provider + picker render from it. Adding a theme = 1 CSS block + 1 registry entry. ZERO component edits (AC-C3 tests this contract explicitly).
- ThemeProvider: `data-theme` on `<html>`, cookie+localStorage, inline no-FOUC script (attribute set before first paint — verified by view-source order, not vibes). Picker in Settings → Appearance w/ live swatches from registry.
- Design language: Supabase-Studio-calm dark neutrals + emerald accent; Lovable-style KPI cards; quieter borders; consistent radius; restyle SHARED components (DataTable, Button/Input/Modal/Card/Sidebar/Headers) so pages inherit. Use the repo `frontend-design` skill conventions.
- **Full-coverage codemod** (review #19): replace ALL numbered palette classes of EVERY hue (gray/zinc/slate/neutral/stone/red/green/emerald/blue/amber/purple/black/white variants) AND hex literals in `src/app`+`src/components` with semantic utilities/vars. Exemption list (data-driven colors, e.g. user-picked badge colors, brand imagery) lives in `.route/theme-exemptions.txt` with per-file justification. Charts consume `--chart-*`.
- Gate script `scripts/check-theme-tokens.mjs`: fails on any non-exempt palette/hex match; wired as `npm run check:theme`; added to gates.

Acceptance criteria:
- AC-C1: `npm run check:theme` = 0 violations (script + exemption file committed; exemptions justified).
- AC-C2: Theme switch restyles terminal+backoffice+storefront live; hard refresh shows no flash (no-FOUC script inline before CSS paint; verified via Playwright-less DOM order assertion in unit test of layout markup + Fable manual check).
- AC-C3: `oasis-contrast` theme exists as CSS block + registry entry ONLY (git diff of its commit touches exactly those two files — objective test of the contract).
- AC-C4: Text token pairs in all three themes pass WCAG AA (script-computed contrast ratios committed to AUDIT.md; component-state spot-checks for hover/disabled documented).
- AC-C5: Zero hex literals in chart code; charts read CSS vars.

## Gates

`npm run typecheck` · `npm run lint` · `npm run test` · `npm run check:theme` · `npm run build`
Fix rounds: typecheck + targeted tests. Full suite once pre-review. New unit tests REQUIRED for: authz negative cases, checkpoint semantics, lock 409, poisoned batch, loyalty mapping (decimals/enrolled_at/delta journal), ENTITY_ENABLED_KEY map, theme registry contract.

## Phase ordering & checkpoints

A(SEC first) → commit → B (Fable applies migration + live-verifies loyalty & cron on dev) → commit → C → commit → full gates → Fable review (§6).
