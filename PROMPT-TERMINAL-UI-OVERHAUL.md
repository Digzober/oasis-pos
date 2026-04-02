# PROMPT: Terminal POS UI Overhaul — From Dev Prototype to Production Register

## Context

Oasis POS terminal has all features built: cart, checkout, returns, orders, customer queue, drawer close, receipt reprint, barcode scanning, offline mode, purchase limit gauge, held carts, keyboard shortcuts. The problem is the assembled UI looks like a developer prototype, not a production POS that 15 locations of budtenders will use 8 hours a day. This prompt is a pure UI/UX overhaul. No new features, no new API routes, no database changes. Every component referenced below already exists and works. We are re-skinning and re-assembling them into a polished, dense, professional register experience.

Read `CLAUDE.md` and `MEMORY.md` before starting.

**Design philosophy:** A POS terminal is not a website. It is a dedicated appliance. Every pixel serves a purpose. Information density is high. Touch targets are large. Transitions are fast. The cart is always visible. The budtender should never scroll to find what they need.

**Color palette (already established):**
- Background: `bg-gray-900`
- Panels/cards: `bg-gray-800`
- Borders: `border-gray-700`
- Primary accent: `emerald-600` / `emerald-500`
- Text primary: `text-gray-50`
- Text secondary: `text-gray-400`
- Danger: `red-500` / `red-600`
- Warning: `amber-500` / `amber-600`

---

## TASK 1: Overhaul CheckoutPage Layout (Main Assembly)

**File:** `src/app/(terminal)/checkout/page.tsx`

The current page is 97 lines and renders components loosely in a flex column. It needs to be the command center that stitches everything into a tight, full-screen register layout.

### Target Layout (full screen, no scrolling on the outer shell):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [HEADER: Logo | Location | Date/Time | Employee/Role | Menu]         h-14   │
├───────────────────────────────────────────────────┬──────────────────────────┤
│                                                   │                          │
│  [TAB BAR: F1 Sale | F2 Returns | F3 Orders | F4] │  CART SIDEBAR (w-[420px])│
│                                                   │                          │
│  [SEARCH BAR — full width, always visible]        │  Customer badge / assign │
│                                                   │  ─────────────────────── │
│  [MAIN CONTENT AREA — scrollable]                 │  Cart items (scrollable) │
│                                                   │                          │
│  Sale tab: product grid (3-4 cols)                │  Item: name, qty, price  │
│  Returns tab: ReturnPanel                         │  Item: name, qty, price  │
│  Orders tab: OrderQueue                           │  Item: name, qty, price  │
│  Customers tab: CustomerQueue + Search            │                          │
│                                                   │  ─────────────────────── │
│                                                   │  Purchase Limit Gauge    │
│                                                   │  Subtotal / Disc / Tax   │
│                                                   │  ═══════════════════════ │
│                                                   │  TOTAL (large, bold)     │
│                                                   │  ─────────────────────── │
│                                                   │  [VOID] [HOLD] [PAY]     │
├───────────────────────────────────────────────────┴──────────────────────────┤
│ [STATUS BAR: Online/Offline | Register | Cache Age | BioTrack | Time] h-8   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Key layout rules:
- The entire page is `h-screen overflow-hidden` — NO page-level scroll
- Left panel: tab bar + content area. Content area scrolls internally.
- Right panel (cart sidebar): always visible, `w-[420px]`, fixed right. Cart items scroll internally. Totals and action buttons are pinned to the bottom.
- Header is `h-14`, status bar is `h-8`. Both are `shrink-0`.
- The left/right split uses `flex flex-1 min-h-0` (existing pattern, keep it).

### Search Bar Placement

Move the search bar OUT of ProductSearch.tsx's internal rendering and into the main layout as a persistent element above the content area. It should always be visible on the Sale tab (not buried inside a scrollable area). When on other tabs, the search bar hides.

```tsx
{activeTab === 'sale' && (
  <div className="px-4 pt-3 pb-2 shrink-0">
    <SearchInput ... />  {/* just the input + barcode icon, not the results */}
  </div>
)}
```

Search results render below in the scrollable content area.

---

## TASK 2: Overhaul ProductSearch — Grid Layout with Product Cards

**File:** `src/components/terminal/ProductSearch.tsx`

Currently 317 lines. The search results display as a list. For a register, products should display as a **dense grid of tappable cards** that a budtender can scan visually and tap quickly.

### Product Card Design

Each product in the search results renders as a card in a responsive grid:

```
┌─────────────────────────┐
│ Brand Name        $XX.XX│  <- top line: brand (gray-400) + price (gray-50, bold)
│ Product Name            │  <- product name (gray-50, medium, max 2 lines truncate)
│ Strain · Indica · 24.5% │  <- strain, type badge, THC% (gray-400, small)
│ ████░░░░  12 in stock   │  <- stock bar + count (green if >10, amber if <5, red if 0)
└─────────────────────────┘
```

Card styling:
- `bg-gray-800 border border-gray-700 rounded-xl p-3 cursor-pointer hover:border-emerald-600 hover:bg-gray-750 transition-all active:scale-[0.98]`
- Grid: `grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3`
- Cards are 100% tap targets — clicking anywhere on the card adds to cart
- Out-of-stock cards: `opacity-50 pointer-events-none` with "Out of Stock" badge
- Cannabis products get a small leaf icon or green dot indicator
- Weight-based products show weight (e.g., "3.5g", "1g") prominently

### Category Filter Bar

Below the search input and above the product grid, show a horizontal scrollable row of category pills:

```tsx
<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
  <button className={active ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'} ...>All</button>
  <button ...>Flower</button>
  <button ...>Concentrates</button>
  <button ...>Edibles</button>
  {/* etc. */}
</div>
```

Clicking a category filters instantly. "All" clears the filter. Active category has emerald background.

### Empty State

When no results found:
```tsx
<div className="flex flex-col items-center justify-center py-12 text-gray-500">
  <SearchIcon className="w-12 h-12 mb-3 text-gray-600" />
  <p className="text-sm">No products found for "{query}"</p>
  <p className="text-xs mt-1">Try a different search or scan a barcode</p>
</div>
```

---

## TASK 3: Overhaul CartSidebar — Dense, Always Visible, Action-Ready

**File:** `src/components/terminal/CartSidebar.tsx`

Currently 340 lines. The sidebar needs to feel like the right panel of a real register: tight, informative, action-ready.

### Structure (top to bottom, all within `w-[420px]`):

**3a. Cart Header (pinned top, h-12)**
```
Current Sale (3)                    [Held 2] [Clear]
```
- "Current Sale" in bold, item count badge in emerald
- Held carts button with amber count badge (only shows if >0)
- Clear button (only shows if items in cart)

**3b. Customer Section (pinned below header, collapsible)**

When no customer assigned:
```
┌─────────────────────────────────────────┐
│ 👤 Assign Customer          [+ New]     │
└─────────────────────────────────────────┘
```
One tap opens the customer search overlay.

When customer assigned:
```
┌─────────────────────────────────────────┐
│ 👤 John Smith · Medical     [✕ Remove]  │
│    Loyalty: 1,240 pts · Last: 3/28      │
└─────────────────────────────────────────┘
```
Shows customer name, type badge (REC green / MED blue), loyalty points, last visit. Tap name to view profile drawer. X to unassign.

**3c. Cart Items (scrollable middle section, `flex-1 overflow-y-auto`)**

Each cart item:
```
┌─────────────────────────────────────────┐
│ Stiiizy OG Kush Pod                     │
│ [ - ]  1  [ + ]              $45.00  ✕  │
└─────────────────────────────────────────┘
```

- Product name (truncated to 1 line, gray-50)
- Quantity controls: minus/plus buttons (`w-8 h-8`) with count between them
- Line total right-aligned, bold
- Remove (X) button at far right, small, gray-500 hover:red-400
- If discount applied to this item, show crossed-out original price + discounted price in emerald
- Divider between items: `border-b border-gray-700/50`

**3d. Discounts Section (below items, only if discounts applied)**
```
┌─────────────────────────────────────────┐
│ 🏷 Happy Hour 20% Off         -$9.00   │
│ 🏷 First Time Customer        -$5.00   │
└─────────────────────────────────────────┘
```
List of applied discounts with names and amounts. Emerald text for savings.

**3e. Purchase Limit Gauge (if customer is assigned and cart has cannabis)**

Keep the existing PurchaseLimitGauge component but make sure it renders here, between discounts and totals. Show the color-coded bar with "X.Xoz of 2.0oz used" text.

**3f. Totals Section (pinned bottom, above action buttons)**
```
Subtotal                          $135.00
Discounts                         -$14.00
Tax                                $12.47
───────────────────────────────────────────
TOTAL                             $133.47
```

- Each line: label left, amount right, `text-sm text-gray-400` for labels, `text-gray-50 tabular-nums` for amounts
- TOTAL line: `text-lg font-bold text-gray-50` with a top border separator
- Discounts line in emerald (only shows if > 0)

**3g. Action Buttons (pinned bottom, h-16)**

Three buttons in a row, equal width:

```
┌─────────────┬─────────────┬─────────────┐
│    VOID     │    HOLD     │     PAY     │
│  (gray-700) │ (amber-600) │(emerald-600)│
└─────────────┴─────────────┴─────────────┘
```

- VOID: `bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white` — disabled if cart empty
- HOLD: `bg-amber-600 text-white hover:bg-amber-500` — disabled if cart empty or 10 held already
- PAY: `bg-emerald-600 text-white hover:bg-emerald-500 text-lg font-bold` — disabled if cart empty or no drawer open
- If no drawer open, PAY button shows "Open Drawer" instead and triggers the drawer open dialog
- All buttons: `h-14 rounded-xl font-semibold text-sm` with active press state `active:scale-[0.97]`

---

## TASK 4: Overhaul TerminalTabBar — Cleaner, Bolder

**File:** `src/components/terminal/TerminalTabBar.tsx`

Currently uses emoji icons (🛒, ↩, 📋, 👤). Replace with Lucide icons for a professional look.

```tsx
import { ShoppingCart, RotateCcw, ClipboardList, Users } from 'lucide-react'

const TABS = [
  { key: 'sale', label: 'Sale', icon: ShoppingCart, shortcut: 'F1' },
  { key: 'returns', label: 'Returns', icon: RotateCcw, shortcut: 'F2' },
  { key: 'orders', label: 'Orders', icon: ClipboardList, shortcut: 'F3' },
  { key: 'customers', label: 'Customers', icon: Users, shortcut: 'F4' },
]
```

Tab styling:
- Active tab: `text-emerald-400 bg-gray-900/50 border-b-2 border-emerald-400`
- Inactive: `text-gray-400 hover:text-gray-200 hover:bg-gray-700/50`
- Each tab: `flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all`
- Icon size: `w-4 h-4`
- Shortcut key label: `text-[10px] text-gray-600 ml-1` (show on lg+ screens)
- Orders tab: red badge with pending order count
- Tab bar background: `bg-gray-800/80 backdrop-blur-sm border-b border-gray-700`

---

## TASK 5: Overhaul TerminalHeader — More Information, Less Wasted Space

**File:** `src/components/terminal/TerminalHeader.tsx`

The header is fine structurally but wastes space. Add the drawer status and receipt reprint shortcut.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [O] Oasis · Central Ave    │  Wed, Apr 1 · 2:45 PM  │  💵 Drawer Open  │ Kane (Admin) ☰ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Changes:
- Add cash drawer status indicator between the date/time and employee name
  - Drawer open: green dot + "Drawer Open" in `text-emerald-400 text-xs`
  - Drawer closed: red dot + "No Drawer" in `text-red-400 text-xs` — clicking opens the drawer dialog
- Add a small receipt/printer icon button that opens ReceiptReprint when clicked (next to the hamburger)
- Hamburger dropdown gets additional items:
  - "Close Drawer" (if drawer open, shift_lead+ only) — opens DrawerCloseModal
  - "Reprint Receipt" — opens ReceiptReprint
  - Divider
  - "Log Out" (red text, existing)

---

## TASK 6: Overhaul CheckoutPanel — Full-Screen Payment Modal

**File:** `src/components/terminal/CheckoutPanel.tsx`

The checkout modal should feel like the final, serious moment of the transaction. Full attention, large numbers, zero ambiguity.

### Payment Screen Layout:

```
┌─────────────────────────────────────────────────────────┐
│                     Complete Sale                     ✕  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   3 items · Walk-in Customer                            │
│                                                         │
│   ┌───────────────────────────────────────────────┐     │
│   │              TOTAL DUE                        │     │
│   │              $133.47                          │     │
│   └───────────────────────────────────────────────┘     │
│                                                         │
│   Cash Tendered                                         │
│   ┌───────────────────────────────────────────────┐     │
│   │              $___                              │     │
│   └───────────────────────────────────────────────┘     │
│                                                         │
│   [$1] [$5] [$10] [$20] [$50] [$100] [Exact]           │
│                                                         │
│   Change Due:  $16.53                                   │
│                                                         │
│   ┌───────────────────────────────────────────────┐     │
│   │           COMPLETE SALE                       │     │
│   │        (disabled until tender >= total)       │     │
│   └───────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Styling details:
- Full-screen overlay: `fixed inset-0 bg-black/80 z-50 flex items-center justify-center`
- Modal: `bg-gray-800 rounded-2xl w-full max-w-lg p-8 border border-gray-700`
- TOTAL DUE: `text-4xl font-bold text-gray-50 text-center tabular-nums` on a `bg-gray-900 rounded-xl p-6`
- Cash tendered input: `text-4xl text-center bg-gray-900 border-2 border-gray-600 focus:border-emerald-500 rounded-xl h-20 tabular-nums` — auto-focus on open
- Quick-add buttons: `h-12 rounded-xl bg-gray-700 text-gray-200 hover:bg-gray-600 font-medium` in a flex row
- "Exact" button: `bg-emerald-700 text-white`
- Change due: `text-2xl text-emerald-400 font-bold tabular-nums` — only shows when tendered >= total
- Complete Sale button: `w-full h-16 rounded-xl bg-emerald-600 text-white text-xl font-bold hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]`

### Success Screen (after transaction completes):

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    ✓ (large checkmark)                  │
│                                                         │
│                  Transaction #10847                     │
│                                                         │
│              Change Due: $16.53                         │
│                    (huge, bold)                          │
│                                                         │
│         [Print Receipt]    [New Sale]                   │
│                                                         │
│           Auto-closing in 5s...                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Checkmark: `text-emerald-400 w-20 h-20` animated (scale up + fade in)
- Transaction number: `text-gray-400 text-lg`
- Change due: `text-5xl font-bold text-emerald-400 tabular-nums`
- Auto-close countdown: `text-gray-500 text-sm` — clears cart and returns to sale tab after 5s
- "New Sale" button closes immediately
- "Print Receipt" triggers browser print

---

## TASK 7: Polish the Login Page

**File:** `src/app/(terminal)/login/page.tsx`

The login page already works (PIN pad, location select, register select). Polish it:

- Center the entire form vertically and horizontally (already done)
- Add a subtle gradient or logo graphic above the title
- Location dropdown: if locations load successfully, auto-select the first one (don't show "No locations available" when there are locations — this is a bug if locations exist but aren't loading)
- PIN dots: animate each dot filling in (scale up briefly)
- After successful PIN entry, show a brief "Welcome, [Name]" with a checkmark before routing to checkout
- Error state (wrong PIN): shake animation on the PIN dots (already exists), plus flash the dots red briefly
- Register selection step: after PIN validates, show available registers as large tappable cards (not a dropdown):
  ```
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Register │  │ Register │  │ Register │
  │    1     │  │    2     │  │    3     │
  │  (open)  │  │ (closed) │  │  (open)  │
  └──────────┘  └──────────┘  └──────────┘
  ```
  Shows drawer status on each register. Green border if drawer open, neutral if closed.

---

## TASK 8: Micro-Interactions and Polish

Apply these across all terminal components:

**8a. Toast Notifications**

Create a shared toast system (or use an existing one) positioned `fixed bottom-20 left-1/2 -translate-x-1/2` (above the status bar). Toasts should:
- Slide up and fade in
- Auto-dismiss after 3 seconds
- Green for success, amber for warning, red for error
- Used for: "Item added to cart", "Sale held", "Customer assigned", "Drawer opened", etc.

**8b. Add-to-Cart Animation**

When a product is tapped and added to cart:
- The product card briefly flashes with an emerald border
- A small "+1" floats up from the card and fades out
- The cart item count badge in the sidebar pulses briefly

**8c. Loading States**

All data-fetching areas should show skeleton loaders (pulsing gray rectangles) instead of blank space or spinners:
- Product grid: skeleton card shapes in the grid
- Cart: skeleton lines
- Customer search results: skeleton rows

**8d. Transition Smoothness**

- Tab switching: content area cross-fades (no hard cut)
- Modal open/close: scale + fade animation (`transition-all duration-150`)
- Sidebar panels (customer search, held carts): slide in from right

---

## Execution Order

All tasks are independent and can run in parallel.

1. Task 1 (CheckoutPage layout) — the main assembly
2. Task 2 (ProductSearch grid) — the most-used view
3. Task 3 (CartSidebar) — always visible, high impact
4. Task 4 (TabBar) — quick win, Lucide icons
5. Task 5 (Header) — add drawer status and menu items
6. Task 6 (CheckoutPanel) — payment modal polish
7. Task 7 (Login page) — first impression
8. Task 8 (Micro-interactions) — finishing touches

## Verification

After all tasks:
- `npm run typecheck` — zero errors
- `npm run lint` — zero errors
- `npm run test` — all existing tests still pass
- Visual verification:
  - Login page renders with location dropdown populated (not "No locations available" if locations exist)
  - Checkout page fills entire screen with no outer scroll
  - Cart sidebar is always visible on right, items scroll internally
  - Product search shows cards in a grid, not a list
  - Tab bar uses Lucide icons, active tab is visually distinct
  - Header shows drawer status
  - Checkout modal has large numbers, auto-focus on cash input
  - Success screen shows change due prominently with auto-close countdown
  - All buttons have hover and active press states
  - Toasts appear above status bar

## DO NOT

- Do NOT change any business logic, API calls, or data flow
- Do NOT add new features or API routes
- Do NOT modify database schema or migrations
- Do NOT change the useCart, useSession, useCashDrawer, or useBarcodeScanner hooks
- This is a pure UI/UX overhaul of existing working components
