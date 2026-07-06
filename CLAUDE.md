# Oasis POS

Mission-critical POS, inventory, ecommerce, and compliance platform for Oasis
Cannabis Co. — a multi-location New Mexico dispensary (15 retail stores,
warehouse, delivery). Next.js 16 App Router, TypeScript strict, Supabase
Postgres, Tailwind v4, Zustand, Vitest + Playwright. Deployed on Vercel at
oasis-pos.vercel.app (main → production, develop → preview). BioTrack handles
NM state compliance.

## Environments

- Dev: `nlyrqgosspjefrkhupja.supabase.co`
- Staging: `qebolhqhtwkubqdmvcgj.supabase.co`
- Production: `lesfrjlccghndhmmvmuo.supabase.co`

## Commands

- `npm run dev` / `npm run build` — dev server / production build
- `npm test` — Vitest unit tests (`test:watch` for watch mode)
- `npm run test:e2e` — Playwright E2E (`test:e2e:ui` for UI mode)
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run seed` — seed dev database (`scripts/seed.ts`)

## Architecture facts

- Next.js 16 differs from your training data — read the relevant guide in
  `node_modules/next/dist/docs/` before writing Next code (see AGENTS.md).
- Route groups: `src/app/(terminal)` POS terminal, `(backoffice)`, `(storefront)`
  online ordering, plus `src/app/api/`. Domain logic lives in `src/lib/`
  (auth, biotrack, calculations, services, validators, offline).
- Auth is PIN-based employee login with JWT sessions (jose); permissions are
  checked in application code.
- Vercel crons (`vercel.json`): BioTrack retry every 5 min, inventory sync and
  order expiry every 15 min, scheduled reports daily 07:00. BioTrack API routes
  get 60s maxDuration; other API routes 30s.
- PWA offline mode queues transactions in IndexedDB and replays on reconnect.

## Capabilities (summary)

Full POS terminal (search, barcode, cart, tax, discounts, purchase-limit
enforcement, checkout), cash drawer management, customers + loyalty, voids and
returns with inventory restoration, BioTrack v3 sale sync + daily
reconciliation, product catalog with location pricing, inventory
receiving/adjustments/transfers, online ordering with reservation and delivery
zones, marketing campaigns, tax (excise + GRT, rec vs medical) and discount
engines, sales reporting, label printing, backoffice dashboard.
