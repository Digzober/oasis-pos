# Oasis Cannabis POS Platform

## Project
Mission-critical POS, inventory, ecommerce, and compliance platform for Oasis Cannabis Co. — a multi-location cannabis dispensary in New Mexico with 15 retail locations, a warehouse, and delivery.

## Stack
- Next.js 16 (App Router)
- Supabase (PostgreSQL)
- Vercel
- BioTrack (NM state compliance)
- TypeScript strict mode
- Tailwind CSS
- Zustand (state management)
- Recharts (charts)
- Vitest (301 unit tests)
- Playwright (E2E tests)

## Environments
- **Dev**: nlyrqgosspjefrkhupja.supabase.co
- **Staging**: qebolhqhtwkubqdmvcgj.supabase.co
- **Production**: lesfrjlccghndhmmvmuo.supabase.co
- **Vercel**: oasis-pos.vercel.app (main → production, develop → preview)

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run 301 unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run typecheck    # TypeScript check
npm run seed         # Seed dev database
```

## Completed Features
- PIN-based employee auth with JWT sessions
- 319 permission definitions across 11 categories
- Full POS terminal: search, barcode scan, cart, tax, discounts, purchase limits, checkout
- Cash drawer management (open, drop, close, reconcile)
- Customer management with loyalty, referrals, segments, groups, badges, configure (doctors, conditions, fields, badge priority)
- Customer detail page (6 tabs: Details, ID & Address, Caregiver, Loyalty & Groups, Purchase History, Transaction History)
- Customer duplicate scan + merge tool
- Transaction creation (atomic across 11 tables)
- Void and return processing with inventory restoration
- BioTrack v3 sale sync with retry queue
- Product catalog CRUD with location pricing
- Inventory full rebuild: list page (24 columns, filters, bulk actions), detail page, 15 action modals (adjust, move, assign status/vendor/batch, convert, combine, sublot, destroy, lab sample, print labels, transactions, audit)
- Inventory receiving (BioTrack manifests + manual)
- Inventory adjustments, transfers, room movements
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
- Shared component library (DataTable, SearchableSelect, etc.)
- Full backoffice with sidebar navigation and location switcher
- Register configure system (8 tabs: guestlist statuses, order workflow, customer cards, adjustment/return/cancellation/void reasons, transaction settings)
- Standalone badges system with manual + automatic assignment
- CI/CD pipeline with GitHub Actions
- Marketing gap parity: campaign analytics/recipients tracking, workflow executions, discount time ranges, event images
- Dutchie gap analysis parity: products (100%), customers (100%), registers (98%), marketing (98%), settings (in progress)

## Agent Execution Rules
- **Always use parallel agents when tasks are independent.** Default to concurrent execution over sequential.
- If two or more tasks have no data dependency between them, launch them simultaneously in a single message with multiple agent calls.
- Only run sequentially when a task genuinely depends on the output of a prior task.
- When uncertain whether tasks are independent, assume they are and parallelize.

## UI/UX Design Rules
- **Always build working front-end UI for every feature.** Never leave a feature as API-only or backend-only.
- Every new feature, setting, integration, or tool MUST include a fully designed, functional front-end page or component.
- Match the existing backoffice dark theme: bg-gray-800 cards, gray-700 borders, emerald-600 accents, gray-50 text.
- Follow established component patterns (DataTable, SearchableSelect, toggle switches, status badges).
- No feature is "done" until it has a usable UI that a non-technical person can interact with.

## Dependencies
- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities — drag-and-drop for guestlist status reordering
