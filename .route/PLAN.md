# PLAN: Settings wiring audit (wired vs placeholder)

Branch: `route/settings-wiring-audit` (forked from route/full-audit-sync-theme HEAD — that is the tree Kane's sidebar reflects).
Class: STANDARD (read-only investigation, doc deliverable, no code changes).

## Assumptions (hands-off mode)
- A-1: Scope = every backoffice settings surface, with location settings as the priority. Kane's question: "are all of these settings wired up? I have a feeling lots of things are placeholders."
- A-2: Deliverable is an audit document + recommendation. NO code fixes in this run — consolidation to a global settings surface is a follow-up task Kane approves after reading the audit.
- A-3: "Wired up" means: toggling the setting changes actual runtime behavior (POS terminal, checkout API, storefront, printing, reports) — not merely that it persists to the DB.

## Goal
Produce `SETTINGS-WIRING-AUDIT.md` (repo root) classifying every settings key/field exposed in the backoffice settings UIs as WIRED / PARTIAL / PLACEHOLDER / DRIFT, with file:line evidence, plus an explanation of why two location-settings surfaces exist and a consolidation recommendation.

## Out of scope (Sol must NOT touch)
- No source-code changes of any kind. The ONLY file created/modified is `SETTINGS-WIRING-AUDIT.md` at repo root.
- No migrations, no fixes, no deleting the duplicate page.

## Known context (verified by Fable, use as starting points)
- Surface A: `src/app/(backoffice)/settings/location-settings/page.tsx` — ~50 keys across 9 sections, saves via PATCH `/api/settings/location-settings` → `location_settings.settings` JSONB for **session.locationId only** (despite the page implying global).
- Surface B: `src/app/(backoffice)/settings/locations/[id]/settings/page.tsx` — 13 keys, saves via PUT `/api/locations/[id]/settings`. Key names DIVERGE from Surface A for the same concepts (e.g. `require_customer` vs `require_customer_checkout`, `print_receipt_auto` vs `auto_print_receipt`, `require_id_verification` vs `require_id_scan`, `biotrack_auto_sync` vs `auto_sync_biotrack`).
- Registry doc: `LOCATION-SETTINGS-KEYS.md` (repo root) lists the intended canonical keys.
- Central reads: `src/lib/services/settingsService.ts#getLocationSettings`, `packageFormatService.ts`, `productFieldConfigService.ts`, `api/registers/configure/settings`, `api/customers/configure/*`.
- Fable's sample grep: `rounding_method|require_customer_checkout|enforce_purchase_limits|auto_print_receipt` appear ONLY in the two settings pages, generated types, and (substring artifacts) settingsService/registers page — no terminal/checkout/runtime consumer found.

## Verdict definitions
- **WIRED**: UI writes it AND a runtime consumer reads it and changes behavior. Cite consumer file:line.
- **PARTIAL**: read somewhere, but the read is display-only, dead, or gated off — behavior does not actually change; or only some of its documented effect exists.
- **PLACEHOLDER**: persisted but nothing outside settings UIs/APIs ever reads it.
- **DRIFT**: written under a key that runtime (or the other surface) reads under a DIFFERENT name — the two never meet. Note both key names.

## Method (required)
1. Enumerate keys from Surface A SECTIONS, Surface B SETTING_CATEGORIES, and LOCATION-SETTINGS-KEYS.md (union).
2. For each key: `rg` the exact key across `src/` (and `supabase/` if present). Trace indirection — settings may flow through `getLocationSettings`, session/bootstrap payloads, Zustand stores, or client fetches of the settings APIs; a key consumed via `settings.foo` or destructuring counts. Check terminal `(terminal)`, storefront `(storefront)`, API routes, `lib/calculations`, printing/receipt code.
3. Sweep the other settings surfaces under `src/app/(backoffice)/settings/*` (appearance, biotrack, delivery, dosages, dutchie, fees, inventory-statuses, labels, limits, package-formats, printers, product-fields, receipts, registers, rooms, taxes) plus `registers/configure/*` and `customers/configure/*`: for each page, state what store it saves to and whether that data drives runtime behavior; per-key tables for toggle-style pages (receipts especially).
4. Answer "why two surfaces" from git history (`git log --follow --oneline` on both pages) and code structure.

## Deliverable format (`SETTINGS-WIRING-AUDIT.md`)
- Executive summary: counts per verdict per surface; top 10 most impactful unwired settings (compliance/money first: purchase limits, ID checks, BioTrack sync, rounding, tax-order flags).
- Per-surface tables: `Key | Written by | Runtime consumer (file:line) | Verdict | Notes`.
- Key-drift table mapping Surface A ↔ Surface B ↔ registry names.
- "Why two surfaces exist" section.
- Consolidation recommendation: single global settings surface (org-level defaults + optional per-location override), which page to keep/kill, which keys to migrate/rename.
- Evidence appendix: grep patterns used for PLACEHOLDER verdicts.

## Acceptance criteria
- AC-1: Every key in Surface A sections AND LOCATION-SETTINGS-KEYS.md has a verdict row (union, no omissions).
- AC-2: Every key in Surface B has a verdict row and appears in the drift table with its Surface A/registry counterpart (or "no counterpart").
- AC-3: Every other `/settings/*` page + registers/configure + customers/configure is covered with at least a page-level wiring verdict; toggle-style pages get per-key rows.
- AC-4: Every WIRED verdict cites at least one runtime consumer file:line that is not a settings UI or its own save API.
- AC-5: Every PLACEHOLDER verdict lists the grep pattern(s) searched (evidence appendix acceptable).
- AC-6: Doc includes the two-surfaces explanation and the consolidation recommendation with a concrete migration key map.
- AC-7: `git status --porcelain` after Sol's run shows ONLY `SETTINGS-WIRING-AUDIT.md` beyond pre-existing `.route/` noise.

## Gates (`.route/gates.txt`)
- Scope gate: Sol's run adds only `SETTINGS-WIRING-AUDIT.md`.
- `npm run typecheck` still green (nothing compiled should change).
- Fable spot-check: sample ≥8 verdicts (mix of WIRED and PLACEHOLDER) and verify against code.

## Edge cases Sol must handle
- Dotted keys (`receipt.show_*`) live inside `location_settings.settings` — but a separate `receipt_config` table also exists in the schema; check which one runtime printing actually uses.
- Register-configure and customer-configure keys are stored in `location_settings` but managed by other pages — do not double-count them as "unwired" just because the location-settings page doesn't show them.
- Substring collisions in grep (`auto_print_receipt` vs registers' `auto_print_receipts` column) — use word-boundary/exact-string matching before declaring WIRED.
- The PWA offline terminal may cache settings in IndexedDB — check `src/lib` offline/bootstrap code paths before declaring POS keys PLACEHOLDER.
