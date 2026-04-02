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
| Inventory | 200 req/min | /inventory |

On 429: read `Retry-After` header or exponential backoff (1s → 2s → 4s → 8s). Max 4 retries.

## Incremental Sync

Parameter: `fromLastModifiedDateUTC` (ISO 8601 UTC). Apply 60-second backward buffer per Dutchie docs.

| Endpoint | Incremental? |
|----------|-------------|
| /products | Yes |
| /customer/customers-paginated | Yes |
| /reporting/register-transactions | Yes |
| /inventory | No (full snapshot) |
| /employees | No (full pull) |
| /room/rooms | No (full pull) |
| All reference endpoints | No |

## Pagination

| Style | Endpoints | Parameters |
|-------|-----------|------------|
| Offset/Limit | /products, /inventory | `offset` + `limit` (max 100) |
| Page/Size | /customer/customers-paginated | `PageNumber` + `PageSize` (max 100) |
| None (single response) | /employees, /brand, /strains, /vendor, /tag, /room, /terminals, /discounts, /pricing-tiers | N/A |

## Endpoints Used

### Auth
| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| GET | /whoami | — | Validate API key, return location info |

### Tier 1: Core Data
| Method | Path | Scope | Rate | Pagination | Incremental |
|--------|------|-------|------|------------|-------------|
| GET | /employees | Org-wide | 300/min | None | No |
| GET | /customer/customers-paginated | Org-wide | 120/min | Page/Size | Yes |
| GET | /products | Org-wide catalog | 120/min | Offset/Limit | Yes |
| GET | /inventory | Per-location | 200/min | Offset/Limit | No |
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
| GET | /discounts/v2/list | discounts | 120/min | None |

### Additional (available but not synced)
| Method | Path | Description |
|--------|------|-------------|
| GET | /customer/referral-sources | Customer referral source options |
| GET | /customer/customer-types | Customer type options |
| GET | /guestlist | Active guest list (checked-in customers) |
| GET | /reporting/inventory | Reporting-tier inventory with stock levels |
| GET | /reporting/transactions | Transaction history |
| GET | /reporting/register-transactions | Cash drawer activity |
| GET | /products/location-overrides | Per-location price overrides |
| GET | /inventory/receivedinventory | Received inventory history |

## Key Response Fields

### /whoami
```json
{ "LocationName": "Oasis - Coors retail", "LocationId": 420140, "CompanyName": "Oasis Cannabis Co", "CompanyId": 420134 }
```

### /products (per item)
Key fields: productId, productName, sku, category, categoryId, masterCategory, brandName, brandId, vendorName, vendorId, strain, strainId, strainType, price, medPrice, recPrice, unitCost, thcContent, thcContentUnit, cbdContent, cbdContentUnit, productGrams, flowerEquivalent, unitType, isCannabis, isActive, onlineProduct, posProducts, tags[], imageUrl, imageUrls[], lastModifiedDateUTC

### /customer/customers-paginated (per item)
Key fields: customerId, firstName, lastName, middleName, emailAddress, phone, cellPhone, status, customerType, mmjidNumber, mmjidExpirationDate, dateOfBirth, gender, isLoyaltyMember, isAnonymous, discountGroups[], referralSource, lastModifiedDateUTC

### /inventory (per item)
Key fields: inventoryId, productId, productName, barcode, batchNumber, lotNumber, packageId, quantityAvailable, allocatedQuantity, unitCost, room, expirationDate, receivedDate, testingStatus, thcContent, cbdContent, labResults

### /employees (per item)
Key fields: employeeId, firstName, lastName, email, phone, role, isActive

## Data Freshness

Dutchie API data has a 1-5 minute delay from POS transactions. This is a sync/reporting API, not real-time.

## Not Syncing (Out of Scope)

- Plants/Harvest (cultivation)
- Deliveries/Drivers/Vehicles
- Transactions (fresh start)
- Purchase Orders
