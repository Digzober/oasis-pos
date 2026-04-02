# Oasis POS — Project Memory

> Persistent context for Claude Code sessions. This file captures decisions, known issues, credentials, integration details, and architectural patterns that get lost between sessions. **Update this file as decisions are made.**

---

## Business Context

- **Company**: Oasis Cannabis Co. — multi-location cannabis dispensary in New Mexico
- **Entities**: 17 total — 15 retail locations + 1 warehouse/MIP + 1 delivery operation
- **Replacing**: Dutchie POS (full platform replacement)
- **Compliance**: BioTrack state traceability (mandatory for NM cannabis)
- **Owner/Operator**: Kane (koueis@oasisvape.com)

---

## Stack & Environments

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 (App Router) — **NOT Pages Router** |
| Database | Supabase (PostgreSQL 17) with RLS on every table |
| Hosting | Vercel (iad1 region) |
| Auth | PIN-based employee login with JWT sessions |
| Compliance | BioTrack API (v1 XML, v3 REST, Trace 2.0) |
| Styling | Tailwind CSS — dark theme (bg-gray-800, gray-700 borders, emerald-600 accents) |
| State | Zustand (client), Supabase (server) |
| Testing | Vitest (301 unit tests), Playwright (E2E) |

| Env | Branch | Supabase ID | Project |
|-----|--------|-------------|---------|
| Dev | feature/* | nlyrqgosspjefrkhupja | oasis-pos-dev |
| Staging | develop | qebolhqhtwkubqdmvcgj | oasis-pos-staging |
| Production | main | lesfrjlccghndhmmvmuo | oasis-pos-prod |

Vercel: `oasis-pos.vercel.app` (main → production, develop → preview)

---

## BioTrack Integration

### Connection Details (All 15 Locations Use Same Credentials)
- **UBI**: `422000036` (identifies the business entity — shared across locations)
- **BioTrack Location ID**: `220091005` (per-location identifier — different per store, example from one location)
- **v1 XML API**: `https://mcp-tracking.nmhealth.org/serverxml.asp` — SOAP/XML, NM Health Dept hosted
- **v3 REST API**: `https://v3.api.nm.trace.biotrackthc.net` — REST/JSON, BioTrack hosted

### Known Issues
- **v3 auth endpoint returns 404**: `POST /auth/login` is wrong for NM's Trace 2.0 server. The correct path needs research. `/v1/login` with PascalCase fields (`Username`, `Password`, `UBI`) is what the test-connection route currently tries. **STATUS: NOT FIXED** — Claude Code prompt provided but not yet executed.
- **v1 works fine**: Same credentials authenticate successfully via SOAP XML to `mcp-tracking.nmhealth.org`
- **Credentials stored as**: `username_encrypted` and `password_encrypted` in `biotrack_config` table (plaintext for now, encryption TODO)

### Config Table: `biotrack_config`
Per-location config with fields: `location_id`, `is_enabled`, `rest_api_url`, `xml_api_url`, `username_encrypted`, `password_encrypted`, `ubi`, `biotrack_location_id`, `sync_interval_minutes`, `auto_sync_enabled`, `last_sync_at`, `settings` (JSONB)

### API Field Name Mapping
The API route maps DB column names to clean frontend names:
- `username_encrypted` ↔ `username`
- `password_encrypted` ↔ `password`
Functions: `dbRowToFrontend()` and `frontendToDbRow()` in `/src/app/api/settings/biotrack-config/route.ts`

---

## Dutchie Integration

### API Details
- **Base URL**: `https://api.pos.dutchie.com` — **NO `/v1` prefix** (existing client had this wrong)
- **Auth**: Basic Auth — API key as username, empty password → `Authorization: Basic ${btoa(apiKey + ':')}`
- **Pagination**: `?offset=0&limit=100` on all list endpoints
- **Rate Limits**: Research needed — not documented in their public Swagger

### Per-Location Scoping
- Each API key is scoped to ONE location
- 15 locations = 15 separate API keys needed
- Customers are org-wide (`shareCustomerProfiles: true`) — dedup by email across locations

### Incremental Sync Support
| Entity | Incremental? | Method |
|--------|-------------|--------|
| Products | Yes | `fromLastModifiedDateUTC` parameter (ISO 8601 UTC) |
| Customers | Yes | `fromLastModifiedDateUTC` parameter |
| Inventory | No | Full pull, diff locally |
| Employees | No | Full pull, diff locally |
| Rooms | No | Full pull, diff locally |

- Always add 60-second backward buffer to `fromLastModifiedDateUTC` to catch edge cases

### Existing Code
- `src/lib/dutchie/client.ts` — DutchieClient (Basic Auth, paginated fetchAll) — **BASE URL NEEDS FIX** (remove `/v1`)
- `src/lib/dutchie/productMapper.ts` — mapDutchieProduct(), extractLookupEntities()
- `src/lib/dutchie/customerMapper.ts` — mapDutchieCustomer(), extractCustomerGroups()
- `src/lib/dutchie/migrationOrchestrator.ts` — runMigration() (batch migration, not live sync)
- `src/app/api/migration/dutchie/route.ts` — Migration API endpoints

### Planned Tables (Not Yet Created)
- `dutchie_config` — Per-location config (mirrors `biotrack_config` pattern) with sync timestamps per entity type
- `dutchie_sync_log` — Tracks every sync run with entity counts, errors, duration

### Prompt Files
- **`PROMPT-DUTCHIE-LIVE-SYNC.md`** — Complete 9-task Claude Code prompt for per-location incremental sync (THE ACTIVE PROMPT)
- **`PROMPT-DUTCHIE-MIGRATION.md`** — Older 4-task batch migration prompt (superseded by live sync)

---

## Database Schema Highlights

### 69+ Tables Across 8 Layers
0. Foundation: organizations, locations, location_settings, employees, permissions
1. Lookups: brands, vendors, strains, tags, tax_categories, pricing_tiers, rooms, subrooms
2. Products: product_categories, products, location_product_prices, product_tags, product_images
3. Customers: customers, customer_groups, customer_group_members, segments
4. Transactions: registers, transactions, transaction_lines, transaction_payments, transaction_taxes, cash_drawers
5. Discounts/Loyalty: discounts (constraints-rewards model), loyalty_config, loyalty_balances, loyalty_transactions
6. Online/Delivery: online_orders, delivery_vehicles, delivery_drivers, delivery_zones
7. Marketing: campaigns, campaign_templates, workflows, events
8. Config: tax_rates, purchase_limits, receipt_config, label_templates, audit_log, biotrack_sync_log

### Critical Conventions
- UUID primary keys everywhere (`gen_random_uuid()`)
- `NUMERIC(12,2)` for money, `NUMERIC(8,6)` for tax rates, `NUMERIC(8,3)` for weights, `NUMERIC(12,3)` for inventory quantities
- Soft deletes via `is_active` + `deactivated_at` (NOT hard deletes)
- `TEXT CHECK (...)` for enums — NOT PostgreSQL ENUM types (can add values without migrations)
- **MANDATORY**: Read `DATABASE-CONSTRAINTS.md` before ANY insert/update code — lists every CHECK constraint
- All FK columns indexed, RLS on every table, partial indexes on booleans

### Checkout Touches 19 Entities
organizations → locations → employees → registers → cash_drawers → customers → products → inventory_items → product_categories → brands/strains/vendors → tags → discounts/constraints/rewards → tax_rates/tax_categories → purchase_limits → loyalty → fees_donations → biotrack_sync_log → audit_log → receipt_config

---

## Completed Features (as of April 2026)

- PIN-based employee auth with JWT sessions
- 319 permission definitions across 11 categories
- Full POS terminal: search, barcode scan, cart, tax, discounts, purchase limits, checkout
- Cash drawer management (open, drop, close, reconcile)
- Customer management with loyalty, referrals, segments, groups, badges
- Customer detail page (6 tabs), duplicate scan + merge tool
- Transaction creation (atomic across 11 tables), void and return processing
- BioTrack v3 sale sync with retry queue
- Product catalog CRUD with location pricing
- Inventory full rebuild: list page (24 columns), detail page, 15 action modals
- Inventory receiving (BioTrack manifests + manual)
- Employee management with permission groups and time clock
- Online ordering with inventory reservation
- Delivery zones with point-in-polygon address checking
- Marketing campaigns, templates, workflows, events
- Tax calculation engine (excise + GRT, rec vs medical)
- Discount evaluation engine (constraints-rewards model, 9 entity types)
- Purchase limit enforcement (flower equivalency)
- Sales reporting: transactions, COGS, shrinkage, valuation
- Backoffice dashboard with KPIs and charts
- BioTrack daily reconciliation
- Label template management and printing
- PWA offline mode with IndexedDB transaction queue
- Register configure system (8 tabs)
- Standalone badges system with manual + automatic assignment
- CI/CD pipeline with GitHub Actions
- BioTrack settings page with real connection testing
- Dutchie gap analysis parity: products (100%), customers (100%), registers (98%), marketing (98%)

---

## Known Issues & TODOs

### Critical
1. **BioTrack v3 auth endpoint 404** — `/auth/login` and `/v1/login` both fail on NM server. Need to research correct endpoint for `v3.api.nm.trace.biotrackthc.net`. v1 XML works fine.
2. **Dutchie client base URL wrong** — Has `/v1` prefix that doesn't exist. Fix in `src/lib/dutchie/client.ts`.

### Pending Migrations (Not Yet Applied to Staging/Prod)
- `biotrack_location_id` column addition (applied to dev only)
- Audit log constraint fix (from prior sessions, dev only)
- Settings gap analysis migration

### Queued Claude Code Prompts (Not Yet Executed)
1. **PROMPT-DUTCHIE-LIVE-SYNC.md** — Full Dutchie per-location sync (9 tasks, highest priority)
2. BioTrack v3 endpoint research & fix
3. Manifests feature
4. Configure/Sidebar updates
5. Receive Inventory enhancements
6. Inventory Rebuild
7. Customer System Rebuild

### Credential Storage
- BioTrack credentials stored as plaintext in `username_encrypted`/`password_encrypted` columns (encryption not yet implemented)
- Dutchie API keys will need secure storage (same pattern planned)

---

## Architectural Patterns

### API Routes
- Always use `requireSession()` for auth
- Always use `createSupabaseServerClient()` for DB access
- Map DB column names to clean frontend names in GET responses
- Map clean frontend names back to DB columns in PATCH/POST
- Return proper HTTP status codes (401, 403, 404, 500)

### Frontend Components
- Dark theme: `bg-gray-800` cards, `gray-700` borders, `emerald-600` accents, `gray-50` text
- Use established component patterns: DataTable, SearchableSelect, toggle switches, status badges
- `inputCls` pattern for consistent input styling across settings pages
- Never pass `null` to controlled input `value` props — always coalesce to empty string
- Sanitize API responses before setting state (use a `sanitizeConfig()` pattern)

### Settings Pages Pattern
- Load config on mount with `useEffect`
- Show loading spinner while fetching
- Dirty state tracking for unsaved changes
- Save via PATCH to API route
- Toast notifications for success/error
- Test Connection button pattern (from BioTrack page)

### Database Operations
- Batch upserts in chunks of 50 for bulk operations
- Idempotency via `dutchie_*_id` columns with UNIQUE partial indexes
- Always use `onConflict` with upserts
- No raw SQL — use Supabase client or parameterized queries

### Forbidden Patterns
- No `any` types without documented justification
- No `console.log` — use `logger` from `@/lib/utils/logger`
- No functions over 50 lines, no components over 200 lines
- No `// TODO` stubs — implement or create GitHub issue
- No text fields where FK entities exist (brands, vendors, strains are ALWAYS UUID references)
- No hardcoded enum values — always reference DATABASE-CONSTRAINTS.md
- No nested ternaries, no magic numbers, no empty catch blocks

### Agent Execution Rules
- Always use parallel agents when tasks are independent
- Default to concurrent execution over sequential
- Only run sequentially when a task genuinely depends on the output of a prior task

### UI/UX Design Rules
- Always build working front-end UI for every feature
- Every new feature MUST include a fully designed, functional front-end page or component
- No feature is "done" until it has a usable UI that a non-technical person can interact with

---

## Key File Locations

| What | Path |
|------|------|
| Project root | `/oasis-pos/` |
| CLAUDE.md (agent instructions) | `/oasis-pos/CLAUDE.md` |
| Database constraints | `/oasis-pos/DATABASE-CONSTRAINTS.md` |
| Location settings keys | `/oasis-pos/LOCATION-SETTINGS-KEYS.md` |
| Go-live checklist | `/oasis-pos/go-live-checklist.md` |
| Dutchie live sync prompt | `/oasis-pos/PROMPT-DUTCHIE-LIVE-SYNC.md` |
| Dutchie migration prompt | `/oasis-pos/PROMPT-DUTCHIE-MIGRATION.md` |
| BioTrack config loader | `/oasis-pos/src/lib/biotrack/configLoader.ts` |
| BioTrack v1 client | `/oasis-pos/src/lib/biotrack/v1Client.ts` |
| BioTrack settings page | `/oasis-pos/src/app/(backoffice)/settings/biotrack/page.tsx` |
| BioTrack config API | `/oasis-pos/src/app/api/settings/biotrack-config/route.ts` |
| BioTrack test connection | `/oasis-pos/src/app/api/settings/biotrack-config/test-connection/route.ts` |
| Dutchie client | `/oasis-pos/src/lib/dutchie/client.ts` |
| Dutchie product mapper | `/oasis-pos/src/lib/dutchie/productMapper.ts` |
| Dutchie customer mapper | `/oasis-pos/src/lib/dutchie/customerMapper.ts` |
| Migration orchestrator | `/oasis-pos/src/lib/dutchie/migrationOrchestrator.ts` |
| Supabase migrations | `/oasis-pos/supabase/migrations/` |
| Scripts | `/oasis-pos/scripts/` |

---

## Session History & Decisions Log

### 2026-04-01: BioTrack + Dutchie Integration Session
- Added `biotrack_location_id` column to `biotrack_config` (distinct from UBI)
- Fixed controlled input errors on BioTrack settings page (null → empty string sanitization)
- Fixed API field name mismatch (username_encrypted → username mapping)
- Built real Test Connection button that authenticates against BioTrack servers
- Discovered v3 auth 404 issue — wrong endpoint path for NM
- Researched Dutchie API thoroughly — found correct base URL, incremental sync params, all endpoints
- Wrote comprehensive PROMPT-DUTCHIE-LIVE-SYNC.md (9 tasks, per-location sync)
- Added Agent Execution Rules and UI/UX Design Rules to CLAUDE.md
- Created this MEMORY.md file

---

*Last updated: 2026-04-01*
