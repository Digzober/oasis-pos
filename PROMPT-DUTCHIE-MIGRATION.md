# PROMPT: Dutchie → Oasis POS Full Data Migration

## Context

We are migrating from Dutchie POS to our custom Oasis POS platform. The migration pipeline foundation exists but needs hardening, a backoffice UI, location_product_prices support, and integration testing against the live Dutchie API. This is a one-time batch migration, NOT a live sync.

**What exists already:**
- `src/lib/dutchie/client.ts` — DutchieClient with Basic Auth, paginated fetchAll, fetchProducts(), fetchCustomers(), whoami()
- `src/lib/dutchie/productMapper.ts` — mapDutchieProduct(), extractLookupEntities()
- `src/lib/dutchie/customerMapper.ts` — mapDutchieCustomer(), extractCustomerGroups()
- `src/lib/dutchie/migrationOrchestrator.ts` — runMigration() orchestrator (lookup entities → products → customers)
- `src/app/api/migration/dutchie/route.ts` — POST (run migration), GET (validate key)
- Idempotency via `dutchie_product_id` on products table, `dutchie_customer_id` on customers table

**What does NOT come from Dutchie:**
- Inventory items (Dutchie API returns empty — inventory comes from BioTrack)
- Settings, registers, rooms, printers, labels, tax rates (backoffice-only, no API)
- Transaction history (not needed for migration — fresh start on our system)

**Dutchie API details:**
- Base URL: `https://api.pos.dutchie.com/v1`
- Auth: Basic Auth with API key as username, empty password → `Authorization: Basic ${btoa(apiKey + ':')}`
- Pagination: `?offset=0&limit=100` on all list endpoints
- Each API key is scoped to ONE location. 15 locations = 15 API keys needed.
- Customers are org-wide (`shareCustomerProfiles: true`), so the same customer may appear in multiple location pulls. Dedup by email.

**Supabase project:** Dev = `nlyrqgosspjefrkhupja`

---

## Task 1: Harden the Existing Migration Pipeline

### 1A: Add batch upsert instead of row-by-row inserts

The current orchestrator inserts products and customers one at a time. This is extremely slow for large catalogs. Refactor to batch upsert:

**Products:** Collect all mapped products, resolve all FKs, then batch upsert in chunks of 50:
```typescript
// Instead of individual inserts, batch them:
const batch = mappedProducts.slice(i, i + 50)
await sb.from('products').upsert(batch, { onConflict: 'dutchie_product_id' })
```

For this to work, `dutchie_product_id` needs a UNIQUE constraint. Create a migration:
```sql
-- Only if not already present
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_dutchie_product_id
  ON products(dutchie_product_id) WHERE dutchie_product_id IS NOT NULL;
```

**Customers:** Same pattern — batch upsert in chunks of 50 on `dutchie_customer_id`:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_dutchie_customer_id
  ON customers(dutchie_customer_id) WHERE dutchie_customer_id IS NOT NULL;
```

Email dedup still applies: before upserting, query all existing customers by email in the org, and for any matches, set their `dutchie_customer_id` so the upsert treats them as updates.

### 1B: Add location_product_prices creation

After products are migrated to the `products` table (org-wide catalog), we need per-location price overrides in `location_product_prices`. The Dutchie API returns per-location pricing because each API key is location-scoped.

For each migrated product, also upsert into `location_product_prices`:
```typescript
{
  product_id: productId,         // resolved from upsert
  location_id: config.locationId,
  rec_price: mapped.rec_price,   // location-specific price from Dutchie
  med_price: mapped.med_price,
  cost_price: mapped.cost_price,
  available_on_pos: mapped.available_on_pos ?? true,
  available_online: mapped.available_online ?? false,
  is_active: mapped.is_active,
}
```

This requires a UNIQUE constraint on `(product_id, location_id)`:
```sql
-- Check if this already exists before creating
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_product_prices_product_location
  ON location_product_prices(product_id, location_id);
```

### 1C: Add product tags migration

`extractLookupEntities()` already extracts tags from Dutchie products. After products are migrated, create the tag associations in `product_tags`:
```typescript
// For each product that has tags:
for (const tagName of dutchieProduct.tags ?? []) {
  const tagId = tagMap.get(tagName)
  if (tagId && productId) {
    tagBatch.push({ product_id: productId, tag_id: tagId })
  }
}
// Batch insert, ignoring duplicates
await sb.from('product_tags').upsert(tagBatch, { ignoreDuplicates: true })
```

Tags table uses `tag_type` discriminator. Products use `tag_type = 'product'`. Make sure to filter/create accordingly:
```typescript
// When creating tags:
{ organization_id, name: tagName, tag_type: 'product' }
```

### 1D: Add product images migration

Dutchie products have `imageUrl` field. For each product with an image, create a `product_images` record:
```typescript
{
  product_id: productId,
  url: dutchieProduct.imageUrl,
  sort_order: 0,
  is_primary: true,
}
```

Do NOT download/re-host the images. Just store the Dutchie CDN URL. We can migrate images to our own storage later.

### 1E: Better error handling and progress tracking

Add a `migration_runs` table to track migration history:
```sql
CREATE TABLE IF NOT EXISTS migration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  source TEXT NOT NULL CHECK (source IN ('dutchie', 'biotrack', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')) DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  result JSONB,
  error_log TEXT[],
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE migration_runs ENABLE ROW LEVEL SECURITY;
```

The orchestrator should:
1. Create a `migration_runs` record at start (status = 'running')
2. Update `result` JSONB with counts as it progresses
3. Set status = 'completed' or 'failed' at end
4. Store error_log array for any per-record failures

---

## Task 2: Build Migration Backoffice UI

Create a migration management page at `src/app/(backoffice)/settings/migration/page.tsx`.

### Layout

This page has two sections:

**Section 1: Dutchie Migration**
- Location selector dropdown (populated from `locations` table)
- API key input field (password type, with show/hide toggle)
- "Validate Key" button → calls `GET /api/migration/dutchie?apiKey=...` → shows location name from Dutchie
- "Dry Run" button → calls `POST /api/migration/dutchie` with `dryRun: true` → shows counts (products, customers) without writing
- "Run Migration" button (disabled until key is validated) → calls `POST /api/migration/dutchie` with `dryRun: false`
- Progress indicator during migration (the API should use streaming or polling — polling is fine for v1)

**Section 2: Migration History**
- Table showing all `migration_runs` for this org
- Columns: Location, Source, Status, Started, Duration, Products (created/updated), Customers (created/updated/skipped), Errors
- Click a row to expand and see the full error_log
- Status badges: running (blue pulse), completed (green), failed (red)

### Styling
- Match existing backoffice dark theme (bg-gray-800 cards, gray-700 borders, emerald accents)
- Same input styles as other settings pages (`inputCls` pattern)

### API Changes

Update `src/app/api/migration/dutchie/route.ts`:
- The POST handler should create a `migration_runs` record and return its ID immediately
- Migration runs in the background (don't block the HTTP response)
- Add a `GET /api/migration/dutchie/status?runId=...` endpoint for polling progress
- Add a `GET /api/migration/dutchie/history` endpoint that returns all migration_runs for the org

---

## Task 3: Dutchie Product Mapper Completeness Audit

Read through `src/lib/dutchie/client.ts` to see the full `DutchieProduct` interface fields. Then read `src/lib/dutchie/productMapper.ts` to see what's currently mapped. Cross-reference against the `products` table columns in the database.

Key things to verify:
1. Every DutchieProduct field that has a corresponding products column is mapped
2. THC/CBD parsing handles both percentage (e.g., "23.5%") and milligram (e.g., "100mg") formats
3. `available_for` field maps correctly to our CHECK constraint values ('both', 'recreational', 'medical')
4. `regulatory_category` maps to valid CHECK constraint values — READ `DATABASE-CONSTRAINTS.md` first
5. Weight fields: `weightGrams`, `grossWeightGrams`, `netWeight` all mapped
6. Boolean fields: `isTaxable`, `allowAutomaticDiscounts`, `isCoupon`, `isOnSale` all mapped
7. Price fields: `recPrice`, `medPrice`, `costPrice`, `salePrice` all mapped as NUMERIC(12,2)

Fix any gaps found. If Dutchie has fields we don't have columns for, document them in a comment but don't create new columns without checking if they matter.

---

## Task 4: Integration Test Script

Create `scripts/test-dutchie-migration.ts` — a standalone script runnable via `npx tsx scripts/test-dutchie-migration.ts`:

```typescript
// Usage: DUTCHIE_API_KEY=xxx LOCATION_ID=xxx npx tsx scripts/test-dutchie-migration.ts
```

The script should:
1. Validate the API key via whoami()
2. Fetch products and log: total count, sample of first 3 products (name, SKU, price, category, brand)
3. Fetch customers and log: total count, sample of first 3 customers (name, email, type)
4. Run extractLookupEntities and log: unique brands, vendors, strains, categories, tags with counts
5. Run extractCustomerGroups and log: unique group names
6. For each mapped product, validate against DATABASE-CONSTRAINTS.md CHECK values
7. Report any mapping errors or unmapped fields
8. Do NOT write to the database — this is read-only validation

---

## File Locations

All new files go in their appropriate directories per project structure:
- API routes: `src/app/api/migration/dutchie/`
- UI pages: `src/app/(backoffice)/settings/migration/page.tsx`
- Scripts: `scripts/`
- Migrations: Apply via Supabase MCP `apply_migration`

## Database Reference

Before writing ANY code that touches the database, read `DATABASE-CONSTRAINTS.md` in the project root. This contains every CHECK constraint. Using a value not in a CHECK constraint will cause a runtime 500 error.

## Naming Conventions

- DB columns: snake_case
- TS types: PascalCase
- Components: PascalCase files
- API routes: kebab-case directories
- No `any` types without documented justification
- No `console.log` — use `logger` from `@/lib/utils/logger`
- No functions over 50 lines — break them up
- No components over 200 lines

## Commit Convention

```
feat(migration): description
```
