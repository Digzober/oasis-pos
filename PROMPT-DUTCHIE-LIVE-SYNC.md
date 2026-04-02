# PROMPT: Dutchie Per-Location Live Sync — Complete Integration

## Philosophy: Don't Build Garbage

This integration MUST work reliably. That means:
- **Every sync function gets a standalone test** that can run against the real API
- **Every mapper has explicit field-by-field mapping** — no magic, no `Object.assign`, no spread-and-pray
- **Every upsert validates against CHECK constraints BEFORE hitting the DB** — fail in code, not at runtime
- **Every sync tracks what it did** — counts, errors, and timing go into `dutchie_sync_log`
- **Incremental sync is the default** — only fetch what changed since last sync. Full pull only on first run.
- **Per-location isolation** — each location has its own API key, its own sync timestamps, its own config. Never mix location data.

Read `DATABASE-CONSTRAINTS.md` before writing ANY database code. Violating a CHECK constraint = 500 error = broken sync.

---

## What We're Syncing

Every entity below maps from a Dutchie API endpoint to one of our Supabase tables. This is the complete list.

### Tier 1: Core Data (must sync)
| Entity | Dutchie Endpoint | Our Table | Scope | Incremental? | Per-Location? |
|--------|-----------------|-----------|-------|-------------|---------------|
| Employees | GET /employees | employees + employee_locations | Employee | No (full pull) | Org-wide, but map location assignments |
| Customers | GET /customer/customers | customers + customer_group_members | Customer | Yes (`fromLastModifiedDateUTC`) | Org-wide (dedup by email) |
| Products | GET /products | products + location_product_prices | Inventory | Yes (`fromLastModifiedDateUTC`) | Catalog is org-wide, prices are per-location |
| Inventory | GET /inventory | inventory_items | Inventory | No (snapshot, diff locally) | Per-location |
| Rooms | GET /room | rooms + subrooms | Room | No (full pull, diff) | Per-location |

### Tier 2: Reference Data (sync once, then on-demand)
| Entity | Dutchie Endpoint | Our Table | Scope |
|--------|-----------------|-----------|-------|
| Brands | GET /brand | brands | none |
| Strains | GET /strains | strains | Inventory |
| Vendors | GET /vendor/vendors | vendors | Vendor |
| Categories | GET /product-category | product_categories | none |
| Tags | GET /tag | tags | Inventory |
| Pricing Tiers | GET /pricing-tiers | pricing_tiers | none |
| Terminals | GET /terminals | registers | none |
| Discounts | GET /discounts/v2/list | discounts (+ constraints/rewards) | Inventory |

### NOT Syncing (out of scope)
- Plants/Harvest (cultivation — excluded per user requirement)
- Deliveries/Drivers/Vehicles (separate feature, not Dutchie sync)
- Transactions (fresh start on our system, no history migration)
- Purchase Orders (separate feature)

---

## Dutchie API Reference

**Base URL:** `https://api.pos.dutchie.com`
**Auth:** HTTP Basic — API key as username, empty password → `Authorization: Basic ${btoa(apiKey + ':')}`
**Each API key is scoped to ONE location.** 15 locations = 15 keys.
**Rate limits:** 120 req/min standard, 300/min for /employees, 60/min for reporting. On 429 → exponential backoff (1s, 2s, 4s, 8s).

**Incremental sync parameter:** `fromLastModifiedDateUTC` (ISO 8601 UTC). Apply 60-second backward buffer per Dutchie docs. Supported on: /products, /customer/customers, /reporting/register-transactions. NOT supported on: /inventory, /employees, /room, reference endpoints.

**Pagination:**
- Offset-based: `offset` + `limit` (max 100) on /products, /inventory
- Page-based: `PageNumber` + `PageSize` (max 100) on /customer/customers-paginated

**IMPORTANT:** The existing client uses base URL `https://api.pos.dutchie.com/v1` — this is WRONG. The API has no `/v1` prefix. Verify against the Swagger spec at `https://api.pos.dutchie.com/swagger/v001/swagger.json`.

---

## Task 1: Migration — `dutchie_config` Table + Dedup Indexes

### dutchie_config table
```sql
CREATE TABLE dutchie_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  api_key_encrypted TEXT,
  dutchie_location_id TEXT,
  dutchie_location_name TEXT,

  -- Per-entity sync timestamps (set to when sync STARTED, not finished)
  last_synced_employees_at TIMESTAMPTZ,
  last_synced_customers_at TIMESTAMPTZ,
  last_synced_products_at TIMESTAMPTZ,
  last_synced_inventory_at TIMESTAMPTZ,
  last_synced_rooms_at TIMESTAMPTZ,
  last_synced_reference_at TIMESTAMPTZ,

  -- Sync toggles
  sync_employees BOOLEAN NOT NULL DEFAULT true,
  sync_customers BOOLEAN NOT NULL DEFAULT true,
  sync_products BOOLEAN NOT NULL DEFAULT true,
  sync_inventory BOOLEAN NOT NULL DEFAULT true,
  sync_rooms BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id)
);

ALTER TABLE dutchie_config ENABLE ROW LEVEL SECURITY;
```

### Dedup columns and indexes
```sql
-- Employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dutchie_employee_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_dutchie_id
  ON employees(dutchie_employee_id) WHERE dutchie_employee_id IS NOT NULL;

-- Products (column exists, add unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_dutchie_id
  ON products(dutchie_product_id) WHERE dutchie_product_id IS NOT NULL;

-- Customers (column exists, add unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_dutchie_id
  ON customers(dutchie_customer_id) WHERE dutchie_customer_id IS NOT NULL;

-- Inventory items — use external_package_id for Dutchie package matching
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_external_pkg
  ON inventory_items(external_package_id, location_id) WHERE external_package_id IS NOT NULL;

-- Rooms — external_id column already exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_external_id
  ON rooms(external_id, location_id) WHERE external_id IS NOT NULL;

-- Registers — add external_id column for terminal matching
ALTER TABLE registers ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_registers_external_id
  ON registers(external_id, location_id) WHERE external_id IS NOT NULL;

-- Brands/Vendors/Strains — add external_id columns
ALTER TABLE brands ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE pricing_tiers ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Sync log table
CREATE TABLE dutchie_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  entity_type TEXT NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_errored INTEGER DEFAULT 0,
  error_details TEXT[],
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

ALTER TABLE dutchie_sync_log ENABLE ROW LEVEL SECURITY;
```

Apply this migration to dev project `nlyrqgosspjefrkhupja`.

---

## Task 2: Rewrite `src/lib/dutchie/client.ts`

Complete rewrite. The existing client is migration-only. New client is the permanent integration client.

```typescript
// src/lib/dutchie/client.ts

const BASE_URL = 'https://api.pos.dutchie.com'  // NO /v1 suffix

export class DutchieClient {
  constructor(private apiKey: string) {}

  // Core GET with rate limit retry + pagination
  private async get<T>(path: string, params?: Record<string, string>): Promise<T>
  private async fetchAllPaginated<T>(path: string, params?: Record<string, string>): Promise<T[]>

  // Auth
  async whoami(): Promise<{ locationName: string; address: string; lspName: string }>

  // Tier 1 entities
  async fetchEmployees(): Promise<DutchieEmployee[]>
  async fetchCustomers(since?: Date): Promise<DutchieCustomer[]>
  async fetchProducts(since?: Date): Promise<DutchieProduct[]>
  async fetchInventory(opts?: { includeLabResults?: boolean; includeRoomQuantities?: boolean }): Promise<DutchieInventoryItem[]>
  async fetchRooms(): Promise<DutchieRoom[]>

  // Tier 2 reference data
  async fetchBrands(): Promise<DutchieBrand[]>
  async fetchStrains(): Promise<DutchieStrain[]>
  async fetchVendors(): Promise<DutchieVendor[]>
  async fetchCategories(): Promise<DutchieCategory[]>
  async fetchTags(): Promise<DutchieTag[]>
  async fetchPricingTiers(): Promise<DutchiePricingTier[]>
  async fetchTerminals(): Promise<DutchieTerminal[]>
  async fetchDiscounts(): Promise<DutchieDiscount[]>
}
```

**Rules for the client:**
- `since` param: subtract 60 seconds, format as ISO 8601 UTC, pass as `fromLastModifiedDateUTC`
- Rate limit: on 429, read `Retry-After` header or backoff 1s→2s→4s→8s. Max 4 retries.
- Pagination: auto-paginate all list endpoints. Products use offset/limit (100). Customers use PageNumber/PageSize (100).
- Timeout: 30 seconds per request via `AbortSignal.timeout(30000)`
- Logging: use `logger` from `@/lib/utils/logger`. Log request count, response time, record count per call.
- NO `console.log` anywhere.

**TypeScript interfaces** go in `src/lib/dutchie/types.ts`. Fetch the Swagger spec from `https://api.pos.dutchie.com/swagger/v001/swagger.json` to get exact field names and types. Define: DutchieEmployee, DutchieCustomer, DutchieProduct, DutchieInventoryItem, DutchieRoom, DutchieBrand, DutchieStrain, DutchieVendor, DutchieCategory, DutchieTag, DutchiePricingTier, DutchieTerminal, DutchieDiscount.

---

## Task 3: Config Loader — `src/lib/dutchie/configLoader.ts`

Same pattern as `src/lib/biotrack/configLoader.ts`:

```typescript
export interface DutchieLocationConfig {
  locationId: string
  isEnabled: boolean
  apiKey: string
  dutchieLocationId: string | null
  dutchieLocationName: string | null
  syncEmployees: boolean
  syncCustomers: boolean
  syncProducts: boolean
  syncInventory: boolean
  syncRooms: boolean
  lastSyncedEmployeesAt: Date | null
  lastSyncedCustomersAt: Date | null
  lastSyncedProductsAt: Date | null
  lastSyncedInventoryAt: Date | null
  lastSyncedRoomsAt: Date | null
  lastSyncedReferenceAt: Date | null
}

export async function loadDutchieConfig(locationId: string): Promise<DutchieLocationConfig | null>
export function clearDutchieConfigCache(locationId?: string): void
export async function updateSyncTimestamp(
  locationId: string,
  entityType: 'employees' | 'customers' | 'products' | 'inventory' | 'rooms' | 'reference',
  timestamp: Date
): Promise<void>
```

5-minute cache. Clear on config update.

---

## Task 4: Mappers — One File Per Entity

Each mapper is a pure function: Dutchie data in → our DB record out. No DB calls inside mappers. No side effects.

### `src/lib/dutchie/mappers/employeeMapper.ts`
```
DutchieEmployee → { employee: Partial<employees row>, locationAssignments: string[] }
```
- Map: first_name, last_name, email, phone, role (map Dutchie role → our CHECK: budtender|shift_lead|manager|admin|owner)
- `pin_hash` is NOT NULL in our schema. Dutchie won't give us PINs. Generate a placeholder hash and flag that employee needs PIN reset.
- `dutchie_employee_id` for dedup
- Extract location assignments from Dutchie's response for `employee_locations` junction

### `src/lib/dutchie/mappers/customerMapper.ts`
```
DutchieCustomer → Partial<customers row>
```
- Map ALL fields: prefix, first_name, middle_name, last_name, suffix, email, phone, mobile_phone, date_of_birth, address fields, medical_card_number, medical_card_expiration, customer_type, status, gender, notes, opted_into_marketing, opted_into_sms, opted_into_loyalty, referral_source, custom_identifier, external_code
- `customer_type` CHECK: 'recreational'|'medical'|'medical_out_of_state'|'medical_tax_exempt'|'non_cannabis'|'distributor'|'processor'|'retailer' — map Dutchie values to these EXACTLY
- `status` CHECK: 'active'|'banned'|'inactive' — map Dutchie Active→active, Archived→inactive, Banned→banned
- `dutchie_customer_id` for dedup

### `src/lib/dutchie/mappers/productMapper.ts`
```
DutchieProduct → { product: Partial<products row>, locationPrice: Partial<location_product_prices row> }
```
- Map ALL product fields to our columns (see products table schema below)
- THC/CBD: parse both percentage ("23.5%") and milligram ("100mg") formats
- `product_type` CHECK: 'quantity'|'weight'
- `default_unit` CHECK: 'each'|'gram'|'eighth'|'quarter'|'half'|'ounce'
- `strain_type` CHECK: 'indica'|'sativa'|'hybrid'|'cbd'
- `net_weight_unit` CHECK: 'g'|'mg'|'oz'|'ml'
- `category_id` is NOT NULL — must resolve FK before upsert, fail the record if no category match
- `slug` is NOT NULL — generate from name via slugify
- Location price record: rec_price, med_price, cost_price, available_on_pos, available_online, is_active
- `dutchie_product_id` for dedup

### `src/lib/dutchie/mappers/inventoryMapper.ts`
```
DutchieInventoryItem → Partial<inventory_items row>
```
- Map: quantity, biotrack_barcode (from Dutchie barcode field), batch_id, lot_number, cost_per_unit, expiration_date, lab results (as JSONB), testing_status, received_at, room assignment, THC/CBD percentages, weight, flower_equivalent_grams
- `testing_status` CHECK: 'untested'|'pending'|'passed'|'failed'
- `product_id` and `location_id` are NOT NULL — must resolve before upsert
- Match to product by SKU or Dutchie product ID
- Match to room by room name or external_id
- `external_package_id` for dedup (Dutchie's package/inventory ID)

### `src/lib/dutchie/mappers/roomMapper.ts`
```
DutchieRoom → { room: Partial<rooms row>, subrooms: Partial<subrooms row>[] }
```
- Map: name, room_types (TEXT[] array), external_id (Dutchie room ID), accessible_by_menu
- `room_types` is NOT NULL TEXT[] array — map Dutchie room type to our values
- `location_id` is NOT NULL — comes from sync context, not Dutchie
- Extract subrooms from Dutchie's response if they include sub-zone data
- Dedup by `external_id` + `location_id`

### `src/lib/dutchie/mappers/referenceMapper.ts`
```
One function per reference entity:
- mapBrand(DutchieBrand) → Partial<brands row>
- mapStrain(DutchieStrain) → Partial<strains row>
- mapVendor(DutchieVendor) → Partial<vendors row>
- mapCategory(DutchieCategory) → Partial<product_categories row>
- mapTag(DutchieTag) → Partial<tags row>
- mapPricingTier(DutchiePricingTier) → Partial<pricing_tiers row>
- mapTerminal(DutchieTerminal) → Partial<registers row>
```
- `strains.strain_type` CHECK: 'indica'|'sativa'|'hybrid'|'cbd' — map Dutchie's Indica/Sativa/Hybrid/CBD to lowercase
- `tags.tag_type` CHECK: 'product'|'inventory'
- `product_categories.slug` is NOT NULL — generate from name
- `product_categories.available_for` CHECK: 'all'|'medical'|'recreational'
- `rooms.room_area_unit` CHECK: 'sqft'|'sqm' (if applicable)

---

## Task 5: Sync Engine — `src/lib/dutchie/syncEngine.ts`

One exported function per entity type. Each follows this exact pattern:

```typescript
async function syncEntity(locationId: string): Promise<SyncResult> {
  // 1. Load dutchie_config for this location
  // 2. Create dutchie_sync_log record (status = 'running')
  // 3. Read last_synced_X_at timestamp
  // 4. Call Dutchie API (with timestamp if incremental, without if first run)
  // 5. Map all records through the mapper
  // 6. Validate each mapped record (CHECK constraints, NOT NULL requirements)
  // 7. Batch upsert valid records in chunks of 50 (ON CONFLICT via dutchie_X_id)
  // 8. Log invalid records as errors (don't crash the whole sync)
  // 9. Update last_synced_X_at to time sync STARTED (step 1 timestamp)
  // 10. Update dutchie_sync_log (status = 'completed', counts, duration)
  // 11. Return SyncResult with counts
}
```

**Exported functions:**
```typescript
export async function syncEmployees(locationId: string, organizationId: string): Promise<SyncResult>
export async function syncCustomers(locationId: string, organizationId: string): Promise<SyncResult>
export async function syncProducts(locationId: string, organizationId: string): Promise<SyncResult>
export async function syncInventory(locationId: string, organizationId: string): Promise<SyncResult>
export async function syncRooms(locationId: string): Promise<SyncResult>
export async function syncReferenceData(locationId: string, organizationId: string): Promise<SyncResult>

// Orchestrators
export async function syncLocation(locationId: string, organizationId: string, entityTypes?: EntityType[]): Promise<LocationSyncResult>
export async function syncAllLocations(): Promise<AllSyncResult>
```

### Sync-specific rules per entity:

**Employees:** Org-wide. Dutchie returns ALL employees regardless of location key. Upsert into `employees` by `dutchie_employee_id`. Then sync `employee_locations` junction based on Dutchie's location assignment data. `pin_hash` is NOT NULL — for new employees, generate a temporary hash (e.g., bcrypt of '0000') and set a `needs_pin_reset` flag in `preferences` JSONB.

**Customers:** Org-wide. Dedup: check `dutchie_customer_id` first. If no match, check `email` within same `organization_id`. If email match found, update that row's `dutchie_customer_id` (so future syncs use the fast path). Batch upsert by `dutchie_customer_id`.

**Products:** Org-wide catalog + per-location prices. Two upserts per product: one into `products` (by `dutchie_product_id`), one into `location_product_prices` (by `product_id` + `location_id`). Before product upsert, resolve FK lookups: brand_id, vendor_id, strain_id, category_id by name match. Create missing lookup entities if not found (auto-create brands, vendors, strains, categories).

**Inventory:** Per-location snapshot. `GET /inventory` with `includeLabResults=true&includeRoomQuantities=true`. No incremental — always returns full current state. Strategy:
1. Fetch full snapshot from Dutchie
2. Load all `inventory_items` for this location from our DB
3. Diff: items in Dutchie but not in ours → INSERT. Items in both → UPDATE if changed. Items in ours but not in Dutchie → set `is_active = false, deactivated_at = now(), deactivation_reason = 'removed_from_dutchie'` (soft delete, NEVER hard delete).
4. Match by `external_package_id`. Resolve `product_id` by matching Dutchie's product reference to our products table (via `dutchie_product_id`). Resolve `room_id` by matching room name/external_id.

**Rooms:** Per-location. Full pull, diff against existing rooms for this `location_id`. Match by `external_id`. Create new rooms, update existing, soft-deactivate removed ones. Also sync subrooms within each room.

**Reference Data:** Org-wide. Sync brands, strains, vendors, categories, tags, pricing tiers, terminals all at once. Each uses name-based matching with `external_id` as secondary key. Terminals map to `registers` table (per-location).

---

## Task 6: API Routes

### `src/app/api/settings/dutchie-config/route.ts`
- GET: Load config for session's location. Mask API key (show last 4 chars only).
- PATCH: Update config. Clear config cache. Map frontend field names to DB column names (same pattern as biotrack-config route).

### `src/app/api/settings/dutchie-config/test-connection/route.ts`
- POST: Load API key from DB, call `/whoami`, return location name + success/failure.
- On success, update `dutchie_location_name` and `dutchie_location_id` in config.

### `src/app/api/dutchie/sync/route.ts`
- POST: `{ entityTypes?: ('employees'|'customers'|'products'|'inventory'|'rooms'|'reference')[] }`
- If no entityTypes, sync all enabled types.
- Returns sync results with per-entity counts.

### `src/app/api/dutchie/sync/log/route.ts`
- GET: Returns recent `dutchie_sync_log` entries for the location. Supports `?limit=20`.

---

## Task 7: Settings Page — `src/app/(backoffice)/settings/dutchie/page.tsx`

Dark theme, matching BioTrack settings page pattern exactly.

**Section 1: Connection**
- API Key input (password type, show/hide toggle)
- "Test Connection" button → calls test-connection → shows green status with Dutchie location name, or red with error
- Connection status indicator (green dot = connected, gray = not configured, red = failed)

**Section 2: Sync Settings**
- 5 toggle switches: Employees, Customers, Products, Inventory, Rooms
- Last synced timestamp per entity (relative: "3 minutes ago", "Never")

**Section 3: Actions**
- "Sync All" button → syncs all enabled types
- Individual "Sync" buttons per entity type
- During sync: spinning indicator, disable buttons
- After sync: show result card with fetched/created/updated/skipped/error counts per entity

**Section 4: Sync History**
- Table from `dutchie_sync_log`: entity_type, sync_type, status, records summary, duration, timestamp
- Status badges: running (blue pulse), completed (green), failed (red)
- Limit to last 20 entries

**IMPORTANT:** All input values must coalesce null to empty string. Never pass null to a controlled input's value prop. Use the `sanitizeConfig` pattern from the BioTrack page.

---

## Task 8: Navigation

Add "Dutchie" to the settings sidebar, next to the BioTrack entry. Find the sidebar component (search for "BioTrack" or "biotrack" in the settings layout/nav) and add a Dutchie link pointing to `/settings/dutchie`.

---

## Task 9: Documentation

Create `docs/DUTCHIE-API-REFERENCE.md` documenting every endpoint we use with method, path, scope, rate limit, parameters, incremental support, and key response fields. Include the authentication format and the Swagger spec URL for future reference.

---

## Database Schema Reference

### CHECK Constraints (MUST NOT VIOLATE)
```
employees.role: 'budtender'|'shift_lead'|'manager'|'admin'|'owner'
customers.status: 'active'|'banned'|'inactive'
customers.customer_type: 'recreational'|'medical'|'medical_out_of_state'|'medical_tax_exempt'|'non_cannabis'|'distributor'|'processor'|'retailer'
customers.id_type: 'drivers_license'|'passport'|'state_id'|'military_id'
products.product_type: 'quantity'|'weight'
products.default_unit: 'each'|'gram'|'eighth'|'quarter'|'half'|'ounce'
products.strain_type: 'indica'|'sativa'|'hybrid'|'cbd'
products.net_weight_unit: 'g'|'mg'|'oz'|'ml'
product_categories.available_for: 'all'|'medical'|'recreational'
inventory_items.testing_status: 'untested'|'pending'|'passed'|'failed'
tags.tag_type: 'product'|'inventory'
rooms.room_area_unit: 'sqft'|'sqm'
dutchie_sync_log.sync_type: 'full'|'incremental'
dutchie_sync_log.status: 'running'|'completed'|'failed'
```

### NOT NULL Fields (must provide or have defaults)
```
employees: id, organization_id, first_name, last_name, pin_hash, role, hire_date, is_active
customers: id, organization_id, is_medical, lifetime_spend(0), visit_count(0), status('active'), opted_into_marketing(false), customer_type('recreational')
products: id, organization_id, category_id, name, slug, rec_price(0), product_type('quantity'), default_unit('each'), is_cannabis(true), is_on_sale(false), requires_medical_card(false), is_taxable(true), is_active(true)
rooms: id, location_id, name, room_types('{}'), accessible_by_menu(false), is_active(true)
inventory_items: id, product_id, location_id, quantity(0), quantity_reserved(0), is_active(true)
registers: id, location_id, name, auto_print_labels(false), auto_print_receipts(true), show_notes(false), is_vault(false), hide_from_pos(false), is_active(true)
```

---

## Files to Create/Modify

**Create:**
- `src/lib/dutchie/types.ts`
- `src/lib/dutchie/client.ts` (rewrite)
- `src/lib/dutchie/configLoader.ts`
- `src/lib/dutchie/syncEngine.ts`
- `src/lib/dutchie/mappers/employeeMapper.ts`
- `src/lib/dutchie/mappers/customerMapper.ts`
- `src/lib/dutchie/mappers/productMapper.ts`
- `src/lib/dutchie/mappers/inventoryMapper.ts`
- `src/lib/dutchie/mappers/roomMapper.ts`
- `src/lib/dutchie/mappers/referenceMapper.ts`
- `src/app/api/settings/dutchie-config/route.ts`
- `src/app/api/settings/dutchie-config/test-connection/route.ts`
- `src/app/api/dutchie/sync/route.ts`
- `src/app/api/dutchie/sync/log/route.ts`
- `src/app/(backoffice)/settings/dutchie/page.tsx`
- `docs/DUTCHIE-API-REFERENCE.md`

**Delete (replaced):**
- `src/lib/dutchie/productMapper.ts` (replaced by mappers/productMapper.ts)
- `src/lib/dutchie/customerMapper.ts` (replaced by mappers/customerMapper.ts)
- `src/lib/dutchie/migrationOrchestrator.ts` (replaced by syncEngine.ts)
- `src/app/api/migration/dutchie/route.ts` (replaced by sync routes)

**Modify:**
- `src/lib/dutchie/index.ts` (update exports)
- Settings sidebar nav (add Dutchie link)

## Supabase Dev Project
`nlyrqgosspjefrkhupja` — apply migration here.

## Naming Conventions
- DB columns: snake_case
- TS types: PascalCase
- Components: PascalCase files
- Mappers: camelCase functions
- No `any` without eslint-disable comment
- No `console.log` — use logger
- No functions over 50 lines
- No components over 200 lines

## Commit
```
feat(dutchie): per-location live sync integration with incremental updates
```
