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
- Customer management with loyalty, referrals, segments
- Transaction creation (atomic across 11 tables)
- Void and return processing with inventory restoration
- BioTrack v3 sale sync with retry queue
- Product catalog CRUD with location pricing
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
- CI/CD pipeline with GitHub Actions
