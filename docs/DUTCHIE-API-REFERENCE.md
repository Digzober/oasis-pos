# Dutchie POS API Reference — Oasis Integration

**Base URL:** `https://api.pos.dutchie.com`
**Swagger Spec:** `https://api.pos.dutchie.com/swagger/v001/swagger.json`
**Auth:** HTTP Basic Auth — API key as username, empty password → `Authorization: Basic ${btoa(apiKey + ':')}`

Each API key is scoped to ONE Dutchie location. Oasis has 16 keys stored in `dutchie_config` table.

## Rate Limits

| Tier | Limit | Endpoints |
|------|-------|-----------|
| Standard | 120 req/min | /products, /brand, /strains, /vendor, /tag, /room, /terminals, /discounts |
| Employees | 300 req/min | /employees |
| Reporting | 60 req/min | /reporting/* |
| Inventory | 200 req/min | /inventory (note: this endpoint returns empty — use /reporting/inventory instead) |

On 429: read `Retry-After` header or exponential backoff (1s → 2s → 4s → 8s). Max 4 retries.

## Response Format

Dutchie uses **camelCase** for all JSON property names (e.g. `productId`, `firstName`, `quantityAvailable`).

**EXCEPTION:** `/whoami` uses **PascalCase** (e.g. `LocationName`, `CompanyName`). Handle both cases.

Responses may be:
- Direct array: `[{...}, {...}]`
- Object wrapping an array: `{ "SomeKey": [{...}] }`
Always unwrap by checking `Array.isArray()` first, then searching object values for an array.

## Incremental Sync

Parameter: `fromLastModifiedDateUTC` (ISO 8601 UTC). Apply 60-second backward buffer per Dutchie docs.

| Endpoint | Incremental? |
|----------|-------------|
| /products | Yes |
| /customer/customers-paginated | Yes |
| /reporting/register-transactions | Yes |
| /reporting/inventory | No (full snapshot) |
| /employees | No (full pull) |
| /room/rooms | No (full pull) |
| All reference endpoints | No |

## Pagination

| Style | Endpoints | Parameters | Max Page Size |
|-------|-----------|------------|---------------|
| Offset/Limit | /products | `offset` + `limit` | 5000 works |
| Skip/Take (PascalCase) | /reporting/inventory | `Skip` + `Take` | 5000 |
| Date window | /reporting/transactions | `FromDateUTC` + `ToDateUTC` (YYYY-MM-DD), max 1440 hours (60 days) | N/A |
| Page/Size | /customer/customers-paginated | `PageNumber` + `PageSize` | 100 |
| None (single response) | /employees, /brand, /strains, /vendor, /tag, /room, /terminals, /discounts, /pricing-tiers | N/A | N/A |

**CRITICAL:** The `/inventory` endpoint (NOT `/reporting/inventory`) returns empty arrays even for locations with stock. Always use `/reporting/inventory` with Skip/Take pagination for inventory data.

## Endpoints Used

### Auth
| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | /whoami | — | Validate API key, return location info. Response uses PascalCase. |

### Tier 1: Core Data
| Method | Path | Scope | Rate | Pagination | Incremental |
|--------|------|-------|------|------------|-------------|
| GET | /employees | Org-wide | 300/min | None | No |
| GET | /customer/customers-paginated | Org-wide | 120/min | Page/Size | Yes |
| GET | /products | Org-wide catalog | 120/min | Offset/Limit | Yes |
| GET | /reporting/inventory | Per-location stock | 60/min | Skip/Take | No |
| GET | /room/rooms | Per-location | 120/min | None | No |

### Tier 2: Reference Data
| Method | Path | Our Table | Rate | Pagination |
|--------|------|-----------|------|------------|
| GET | /brand | brands | 120/min | None |
| GET | /strains | strains | 120/min | None |
| GET | /vendor/vendors | vendors | 120/min | None |
| GET | /product-category | product_categories | 120/min | None |
| GET | /tag | tags | 120/min | None |
| GET | /pricing-tiers | pricing_tiers | 120/min | None |
| GET | /terminals | registers | 120/min | None |
| GET | /reporting/transactions | transactions | 60/min | `FromDateUTC` + `ToDateUTC` (YYYY-MM-DD), `IncludeDetail`, `IncludeTaxes` |
| GET | /discounts/v2/list | discounts | 120/min | None |

### Additional (available but not synced)
| Method | Path | Description |
|--------|------|-------------|
| GET | /customer/referral-sources | Customer referral source options |
| GET | /customer/customer-types | Customer type options |
| GET | /guestlist | Active guest list (checked-in customers) |
| GET | /inventory | EMPTY — do not use, use /reporting/inventory instead |
| GET | /reporting/transactions | Transaction history (Skip/Take pagination) |
| GET | /reporting/register-transactions | Cash drawer activity |
| GET | /products/location-overrides | Per-location price overrides |
| GET | /inventory/receivedinventory | Received inventory history |

## Key Response Fields

### /whoami (PascalCase!)
```json
{ "LocationName": "Oasis - Coors retail", "LocationId": 420140, "CompanyName": "Oasis Cannabis Co", "CompanyId": 420134 }
```

### /products (per item, camelCase)
Key fields: productId, productName, sku, category, categoryId, masterCategory, brandName, brandId, vendorName, vendorId, strain, strainId, strainType, price, medPrice, recPrice, unitCost, thcContent, thcContentUnit, cbdContent, cbdContentUnit, productGrams, flowerEquivalent, unitType, isCannabis, isActive, isTaxable, onlineProduct, posProducts, tags[], imageUrl, imageUrls[], lastModifiedDateUTC

### /customer/customers-paginated (per item, camelCase)
Key fields: customerId, firstName, lastName, middleName, emailAddress, phone, cellPhone, status, customerType, mmjidNumber, mmjidExpirationDate, dateOfBirth, gender, isLoyaltyMember, isAnonymous, discountGroups[], referralSource, lastModifiedDateUTC

### /reporting/inventory (per item, camelCase)
Key fields: inventoryId, productId, productName, sku, category, categoryId, brandName, imageUrl, quantityAvailable, quantityUnits, unitWeight, unitWeightUnit, unitCost, flowerEquivalent, flowerEquivalentUnits, batchId, batchNumber, lotNumber, barcode, packageId, testingStatus, thcContent, cbdContent, expirationDate, receivedDate, labResults, allocatedQuantity

### /employees (per item, camelCase)
Key fields: employeeId, firstName, lastName, email, phone, role, isActive

## Sync Engine — Column Mapping

### employees → employees table
| Dutchie Field | DB Column |
|---|---|
| employeeId | dutchie_employee_id (stored as string) |
| firstName | first_name |
| lastName | last_name |
| email | email |
| phone | phone |
| role | role (mapped: budtender/shift_lead/manager/admin/owner) |
| isActive | is_active |

### customers → customers table
| Dutchie Field | DB Column |
|---|---|
| customerId | dutchie_customer_id |
| firstName | first_name |
| lastName | last_name |
| namePrefix | prefix |
| nameSuffix | suffix |
| cellPhone | mobile_phone |
| postalCode | zip |
| mmjidExpirationDate | medical_card_expiration |
| isLoyaltyMember | opted_into_loyalty |
| driversLicenseHash | drivers_license |
| lastTransactionDate | last_visit_at |

### products → products table
| Dutchie Field | DB Column |
|---|---|
| productId | dutchie_product_id |
| internalName | alternate_name |
| unitCost | cost_price |
| thcContent (parsed) | thc_percentage, thc_content_mg |
| cbdContent (parsed) | cbd_percentage, cbd_content_mg |
| unitTHCContentDose | unit_thc_dose |
| unitCBDContentDose | unit_cbd_dose |
| grossWeight | gross_weight_grams |
| onlineProduct | available_online |
| posProducts | available_on_pos |
| ingredientList | ingredients |
| isTaxable | is_taxable |

### products → location_product_prices table
| Dutchie Field | DB Column |
|---|---|
| unitCost | cost_price |
| posProducts | available_on_pos |
| onlineAvailable | available_online |

### /reporting/inventory → inventory_items table
| Dutchie Field | DB Column |
|---|---|
| quantityAvailable | quantity |
| unitCost | cost_per_unit |
| barcode | biotrack_barcode |
| batchNumber | batch_id |
| thcContent (parsed) | thc_percentage |
| cbdContent (parsed) | cbd_percentage |
| productGrams | weight |
| flowerEquivalent | flower_equivalent_grams |
| labResults | lab_test_results |
| receivedDate | received_at |
| packageId | external_package_id |

### vendors → vendors table
| Dutchie Field | DB Column |
|---|---|
| license | license_number |
| zip | zip |

## Upsert Conflict Columns

Each sync uses upsert with these conflict resolution columns (must match UNIQUE constraints in DB):

| Table | onConflict Columns | Constraint Name |
|---|---|---|
| employees | organization_id, dutchie_employee_id | employees_org_dutchie_emp_key |
| customers | organization_id, dutchie_customer_id | customers_org_dutchie_cust_key |
| products | organization_id, dutchie_product_id | products_org_dutchie_prod_key |
| inventory_items | location_id, external_package_id | inventory_items_loc_ext_pkg_key |
| location_product_prices | product_id, location_id | location_product_prices_location_id_product_id_key |
| brands | organization_id, name | brands_organization_id_name_key |
| strains | organization_id, name | strains_organization_id_name_key |
| vendors | organization_id, name | vendors_organization_id_name_key |
| product_categories | organization_id, slug | product_categories_organization_id_slug_key |
| tags | organization_id, name, tag_type | tags_organization_id_name_tag_type_key |
| pricing_tiers | organization_id, name | pricing_tiers_organization_id_name_key |
| rooms | location_id, name | rooms_location_id_name_key |
| subrooms | room_id, name | subrooms_room_id_name_key |
| registers | location_id, name | registers_location_id_name_key |

**IMPORTANT:** PostgREST requires real UNIQUE constraints (not partial indexes with WHERE clauses) for ON CONFLICT to work. After adding constraints, run `NOTIFY pgrst, 'reload schema'` to refresh the schema cache.

## Sync Order

Sync MUST run in dependency order:
1. **reference** — brands, strains, vendors, categories, tags, pricing tiers, terminals
2. **rooms** — needed for inventory room assignment
3. **employees** — independent
4. **products** — depends on reference data for FK resolution
5. **customers** — independent
6. **inventory** — depends on products for product_id FK, rooms for room_id FK

## Known Gotchas

1. **`/inventory` returns empty** — Use `/reporting/inventory` with Skip/Take (PascalCase) pagination instead.
2. **`/whoami` uses PascalCase** — Unlike all other endpoints which use camelCase.
3. **PostgREST schema cache** — After schema changes (new columns, constraints), run `NOTIFY pgrst, 'reload schema'` or the Supabase dashboard "Reload Schema" button.
4. **product_id on inventory_items is nullable** — During sync, inventory may arrive before products. The FK is resolved by `buildDutchieProductMap` which matches on `dutchie_product_id`.
5. **Batch size** — 200 items per upsert batch. Larger batches may hit Supabase request size limits.
6. **FK resolution** — Brands, vendors, strains, and categories are bulk-upserted before the product mapping loop to avoid N+1 DB queries.
