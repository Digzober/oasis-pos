# PROMPT: Day One Readiness — Mapper Fixes + Terminal Workflow Parity

## Context

Oasis POS is replacing Dutchie across 15 cannabis retail locations in New Mexico. The core POS terminal, checkout, discounts, cash drawer, reporting, and BioTrack integration are all built. However, there are two categories of issues that will cause failures on day one:

1. **Dutchie data mapper constraint violations** — the sync will crash on insert due to CHECK and NOT NULL constraint mismatches
2. **Terminal workflow gaps** — three workflows that budtenders and shift leads use daily in Dutchie are missing or incomplete

This prompt covers both. Execute all 6 tasks. Read `DATABASE-CONSTRAINTS.md` and `MEMORY.md` before starting any task.

---

## TASK 1: Fix Product Mapper Constraint Violations

**File:** `src/lib/dutchie/productMapper.ts`

### Problem
Three product fields are passed raw from Dutchie without validation against our CHECK constraints. One required NOT NULL field (`slug`) is completely missing.

### Requirements

**1a. Add `slug` to MappedProduct interface and mapDutchieProduct()**

`products.slug` is NOT NULL with no default. Generate from product name:
```typescript
function generateSlug(name: string, dutchieId: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80)
  return `${base}-${dutchieId}`
}
```
The dutchie_product_id suffix guarantees uniqueness across products with similar names.

**1b. Add `mapProductType()` validation function**

Valid values per DATABASE-CONSTRAINTS.md: `'quantity'`, `'weight'`

```typescript
function mapProductType(dutchieType: string | null): 'quantity' | 'weight' {
  if (!dutchieType) return 'quantity'
  const lower = dutchieType.toLowerCase()
  if (lower === 'weight' || lower === 'gram' || lower === 'grams' || lower === 'g' || lower === 'weighted') return 'weight'
  return 'quantity'
}
```

Replace line 109: `product_type: dp.unitType ?? null` → `product_type: mapProductType(dp.unitType)`

**1c. Add `mapNetWeightUnit()` validation function**

Valid values: `'g'`, `'mg'`, `'oz'`, `'ml'`

```typescript
function mapNetWeightUnit(dutchieUnit: string | null): string | null {
  if (!dutchieUnit) return null
  const lower = dutchieUnit.toLowerCase()
  if (lower === 'g' || lower === 'gram' || lower === 'grams') return 'g'
  if (lower === 'mg' || lower === 'milligram' || lower === 'milligrams') return 'mg'
  if (lower === 'oz' || lower === 'ounce' || lower === 'ounces') return 'oz'
  if (lower === 'ml' || lower === 'milliliter' || lower === 'milliliters') return 'ml'
  return 'g' // safe default for cannabis products
}
```

Replace line 130: `net_weight_unit: dp.netWeightUnit ?? null` → `net_weight_unit: mapNetWeightUnit(dp.netWeightUnit)`

**1d. Add `mapDefaultUnit()` validation function**

Valid values: `'each'`, `'gram'`, `'eighth'`, `'quarter'`, `'half'`, `'ounce'`

```typescript
function mapDefaultUnit(dutchieUnit: string | null, productType: 'quantity' | 'weight'): string {
  if (!dutchieUnit) return productType === 'weight' ? 'gram' : 'each'
  const lower = dutchieUnit.toLowerCase()
  if (lower === 'each' || lower === 'ea' || lower === 'unit') return 'each'
  if (lower === 'gram' || lower === 'g') return 'gram'
  if (lower === 'eighth' || lower === '3.5g' || lower === '3.5') return 'eighth'
  if (lower === 'quarter' || lower === '7g' || lower === '7') return 'quarter'
  if (lower === 'half' || lower === '14g' || lower === '14') return 'half'
  if (lower === 'ounce' || lower === 'oz' || lower === '28g' || lower === '28') return 'ounce'
  return productType === 'weight' ? 'gram' : 'each'
}
```

Add `default_unit` to MappedProduct interface and the return object in mapDutchieProduct().

**1e. Ensure `category_id` fallback in orchestrator**

In `migrationOrchestrator.ts`, when inserting products: if category lookup returns null (Dutchie product has no category or unmapped category), use a fallback "Uncategorized" category. Before the product insert loop, ensure this exists:

```typescript
// Ensure fallback category exists
const { data: fallbackCat } = await sb.from('product_categories')
  .select('id')
  .eq('organization_id', config.organizationId)
  .eq('name', 'Uncategorized')
  .maybeSingle()

let fallbackCategoryId = fallbackCat?.id
if (!fallbackCategoryId) {
  const { data: created } = await sb.from('product_categories')
    .insert({
      organization_id: config.organizationId,
      name: 'Uncategorized',
      slug: 'uncategorized',
      is_active: true,
    })
    .select('id')
    .single()
  fallbackCategoryId = created!.id
}
```

Then in the product insert, replace any null category_id with `fallbackCategoryId`.

---

## TASK 2: Fix Customer Mapper Constraint Violation

**File:** `src/lib/dutchie/customerMapper.ts`

### Problem
`mapCustomerType()` returns `'both'` but `'both'` is NOT a valid CHECK constraint value.

Valid customer_type values per DATABASE-CONSTRAINTS.md:
`'recreational'`, `'medical'`, `'medical_out_of_state'`, `'medical_tax_exempt'`, `'non_cannabis'`, `'distributor'`, `'processor'`, `'retailer'`

### Fix

Replace the `mapCustomerType` function:

```typescript
type ValidCustomerType = 'recreational' | 'medical' | 'medical_out_of_state' | 'medical_tax_exempt' | 'non_cannabis' | 'distributor' | 'processor' | 'retailer'

function mapCustomerType(dutchieType: string | null): ValidCustomerType {
  if (!dutchieType) return 'recreational'
  const lower = dutchieType.toLowerCase()
  if (lower === 'medical') return 'medical'
  if (lower === 'both' || lower === 'dual') return 'medical' // has medical card, medical takes priority
  if (lower === 'medical_out_of_state' || lower === 'out of state' || lower === 'out_of_state') return 'medical_out_of_state'
  if (lower === 'medical_tax_exempt' || lower === 'tax exempt' || lower === 'tax_exempt') return 'medical_tax_exempt'
  if (lower === 'non_cannabis' || lower === 'non cannabis' || lower === 'noncannabis') return 'non_cannabis'
  if (lower === 'distributor') return 'distributor'
  if (lower === 'processor') return 'processor'
  if (lower === 'retailer') return 'retailer'
  return 'recreational'
}
```

Update the `MappedCustomer` interface `customer_type` field to use `ValidCustomerType` instead of `'recreational' | 'medical' | 'both'`.

---

## TASK 3: Verify Employee Role Mapper

**File:** `src/lib/dutchie/migrationOrchestrator.ts` (function at ~line 523)

### Requirement

Verify that `mapEmployeeRole()` ONLY returns values in the CHECK constraint: `'budtender'`, `'shift_lead'`, `'manager'`, `'admin'`, `'owner'`

If the function is missing or incomplete, implement:

```typescript
function mapEmployeeRole(dutchieRole: string | null): 'budtender' | 'shift_lead' | 'manager' | 'admin' | 'owner' {
  if (!dutchieRole) return 'budtender'
  const lower = dutchieRole.toLowerCase()
  if (lower === 'owner' || lower === 'director') return 'owner'
  if (lower === 'admin' || lower === 'administrator') return 'admin'
  if (lower === 'manager' || lower === 'general_manager' || lower === 'general manager' || lower === 'gm' || lower === 'assistant_manager') return 'manager'
  if (lower === 'shift_lead' || lower === 'shift lead' || lower === 'lead' || lower === 'supervisor') return 'shift_lead'
  return 'budtender' // safe default: lowest permission level
}
```

---

## TASK 4: Customer Check-In Queue for Terminal

### Problem
Dutchie has a shared customer queue visible across all terminals at a location. A door person checks customers in, and budtenders see the queue and claim the next customer. Our terminal has customer lookup (F4 tab) but no shared queue that multiple terminals see simultaneously.

### Implementation

**4a. API Route: `/src/app/api/terminal/queue/route.ts`**

```
GET  /api/terminal/queue?location_id=xxx     — Returns active queue for location
POST /api/terminal/queue                      — Check in a customer (door person)
PATCH /api/terminal/queue                     — Claim or update queue entry (budtender)
DELETE /api/terminal/queue?id=xxx             — Remove from queue (completed or no-show)
```

Use the existing `guestlist_entries` table. Required fields per DATABASE-CONSTRAINTS.md:
- `source`: CHECK values are `'walk_in'`, `'online_pickup'`, `'online_delivery'`, `'curbside'`, `'drive_thru'`, `'phone'`, `'kiosk'`
- `customer_type`: CHECK values are `'recreational'`, `'medical'`

GET response shape:
```typescript
interface QueueEntry {
  id: string
  customer_id: string | null
  customer_name: string
  customer_type: 'recreational' | 'medical'
  source: string
  checked_in_at: string // ISO timestamp
  position: number
  wait_time_minutes: number // calculated from checked_in_at
  claimed_by_employee_id: string | null
  claimed_by_name: string | null
  status: 'waiting' | 'claimed' | 'serving'
  notes: string | null
}
```

POST body (door person checks in):
```typescript
{
  location_id: string
  customer_id?: string // optional, can be walk-in without lookup
  customer_name: string
  customer_type: 'recreational' | 'medical'
  source: 'walk_in' | 'online_pickup' | etc.
  notes?: string
  party_size?: number
}
```

**4b. Terminal Queue Component: `src/components/terminal/CustomerQueue.tsx`**

This replaces or augments the F4 tab content when queue mode is enabled.

Display:
- Header showing queue count: "12 customers waiting"
- Scrollable list of queue entries, ordered by checked_in_at ascending (FIFO)
- Each entry shows: position number, customer name, type badge (REC/MED), wait time (live updating), source icon
- Color coding: green (<5 min wait), yellow (5-15 min), red (>15 min)
- "Claim Next" button at top — claims the oldest unclaimed entry and loads that customer into the current cart session
- Individual "Claim" button per entry for out-of-order claiming
- Claimed entries show the budtender's name and dim slightly
- Entries in "serving" status move to a collapsed "Now Serving" section

**4c. Real-time Updates**

Subscribe to Supabase realtime changes on `guestlist_entries` filtered by location_id:
```typescript
supabase
  .channel('queue-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'guestlist_entries',
    filter: `location_id=eq.${locationId}`,
  }, handleQueueUpdate)
  .subscribe()
```

This ensures all terminals see check-ins and claims instantly without polling.

**4d. Door Check-In Component: `src/components/terminal/DoorCheckIn.tsx`**

Simplified check-in form for the door person's terminal:
- Customer name field (required)
- Customer type toggle: REC / MED
- Optional: quick customer lookup by ID scan or name search
- Optional: notes field
- "Check In" button
- Below the form: live queue list (read-only view of who's waiting)

**4e. Integration with Checkout**

When a budtender claims a queue entry:
1. If the entry has a `customer_id`, auto-assign that customer to the cart
2. Update the queue entry status to `'serving'`
3. When the transaction completes (or cart is voided), update the queue entry status to remove it from active queue
4. If the budtender logs out or abandons the cart, release the claim (set back to `'waiting'`)

---

## TASK 5: Drawer Close from Terminal

### Problem
Shift leads close their drawer from the register in Dutchie. In our system, drawer close is only accessible from backoffice. This breaks the end-of-shift workflow.

### Implementation

**5a. API Route: `/src/app/api/terminal/drawer/close/route.ts`**

POST body:
```typescript
{
  cash_drawer_id: string
  actual_cash: number // counted cash amount
  notes?: string
}
```

Processing:
1. Validate the requesting employee has `shift_lead`, `manager`, `admin`, or `owner` role
2. Calculate expected cash: `opening_amount + cash_sales - cash_refunds - safe_drops`
3. Set `closing_amount = actual_cash`, `expected_amount = calculated`, `variance = actual - expected`
4. Update `cash_drawers` set `status = 'closed'`, `closed_by = employee_id`, `closed_at = now()`
5. Return the closing summary with variance

Response:
```typescript
{
  success: true
  summary: {
    opening_amount: number
    total_sales: number
    total_refunds: number
    total_drops: number
    expected_cash: number
    actual_cash: number
    variance: number
    transaction_count: number
    drawer_duration_hours: number
  }
}
```

**5b. Terminal Drawer Close Modal: `src/components/terminal/DrawerCloseModal.tsx`**

Trigger: Button in the cart sidebar (visible only when a drawer is open and employee role >= shift_lead)

Modal flow:
1. **Count Screen**: Large numeric input for "Enter Counted Cash". Quick-add denomination buttons ($1, $5, $10, $20, $50, $100 + coin buttons) that accumulate a running total. "Manual Entry" toggle to type a flat amount instead.
2. **Review Screen**: Shows opening amount, expected cash (calculated from sales/refunds/drops), actual cash (what they counted), variance with color coding (green <$5, amber $5-$20, red >$20).
3. **Confirm Screen**: "Close Drawer" button. Optional notes field for explaining variance.
4. **Success Screen**: Closing summary with transaction count, total sales, duration. "Print Closing Report" button. Auto-returns to login screen after 10 seconds (shift is over).

**5c. Permission Check**

Only employees with role `shift_lead`, `manager`, `admin`, or `owner` can close a drawer. If a budtender tries, show: "Ask your shift lead to close the drawer."

---

## TASK 6: Receipt Reprint from Terminal

### Problem
Customers ask for receipt copies. Budtenders need to reprint without leaving the terminal.

### Implementation

**6a. API Route: `/src/app/api/terminal/receipt/[transactionId]/route.ts`**

GET: Returns receipt data for the given transaction ID.

Response: Full receipt payload (same shape as what the receipt printer receives at checkout time). Include: transaction number, date, items, discounts, taxes, total, payment, change, customer name if present, employee name, location name.

**6b. Terminal Component: `src/components/terminal/ReceiptReprint.tsx`**

Access: Small "Recent" or "Reprint" button in the terminal header or cart sidebar area.

Flow:
1. Shows last 10 transactions for this register (most recent first)
2. Each row: transaction #, time, total, customer name
3. Click a row → preview receipt on screen
4. "Print" button sends to receipt printer
5. "Email" button (if customer has email on file) sends a digital copy

This is a simple lookup + print action; no complex logic needed.

---

## Execution Order

1. **Task 1** (product mapper fixes) — no dependencies
2. **Task 2** (customer mapper fix) — no dependencies
3. **Task 3** (employee role verification) — no dependencies
4. **Task 4** (customer queue) — no dependencies on Tasks 1-3
5. **Task 5** (drawer close from terminal) — no dependencies
6. **Task 6** (receipt reprint) — no dependencies

**Tasks 1, 2, and 3 can run in parallel.** They touch different files.
**Tasks 4, 5, and 6 can run in parallel.** They are independent terminal features.

## Verification

After all tasks complete:
- Run `npm run typecheck` — zero errors
- Run `npm run lint` — zero errors
- Run `npm run test` — all passing
- Manually verify: the mappers produce ONLY values listed in DATABASE-CONSTRAINTS.md for every CHECK-constrained field
- Manually verify: product inserts include `slug` and `category_id` (never null)
- Manually verify: customer inserts never contain `customer_type: 'both'`
- Manually verify: DrawerCloseModal is accessible from terminal for shift_lead+ roles
- Manually verify: CustomerQueue subscribes to realtime and updates across multiple browser tabs
- Manually verify: ReceiptReprint shows last 10 transactions and triggers print
