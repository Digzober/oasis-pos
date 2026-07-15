# PLAN v3: Settings wiring audit (wired vs placeholder)

Branch: `route/settings-wiring-audit`. v2 resolved round-1 review (`.route/plan-review-audit-1.txt`); v3 resolves round-2 (`.route/plan-review-audit-2.txt`): row identity = control+surface, REDIRECT/READ-ONLY classifications added, systemic write defects moved out of per-row precedence, deterministic spot-check sampling.
Class: STANDARD (read-only investigation, doc deliverable, no code changes).

## Assumptions (hands-off mode)
- A-1: Scope = every settings/configuration surface reachable from the backoffice sidebar. Kane's question: "are all of these settings wired up? I have a feeling lots of things are placeholders."
- A-2: Deliverable is an audit document + recommendation. NO code fixes in this run.
- A-3: This is a STATIC WIRING audit: "wired" is proven by a complete static code path from writer to a behavioral branch reachable from a production entry point. Live runtime/DB verification is out of scope; the doc must state this limitation. (Resolves F5.)

## Goal
Produce `SETTINGS-WIRING-AUDIT.md` (repo root) classifying every independently mutable settings control exposed in the backoffice as wired or not, with evidence, plus an explanation of the two location-settings surfaces and an evidence-based consolidation recommendation.

## Out of scope (Sol must NOT touch)
- No source-code changes. The ONLY file created is `SETTINGS-WIRING-AUDIT.md` at repo root.

## Surface inventory (F1, F2 — complete, from Sidebar.tsx; one verdict row per independently mutable control)
1. `/settings/location-settings` (Surface A — 46 controls, 8 sections at current HEAD)
2. `/settings/locations` (READ-ONLY list) + `/settings/locations/[id]/settings` (Surface B — the 13-control writer tab) + other `[id]/*` tabs per their own controls (R2-F2)
3. `LOCATION-SETTINGS-KEYS.md` registry (89 paths; union with A+B = 96 keys). Registry is a CANDIDATE source, not authority (F6) — it is already stale (missing `package_id_formats`, `product_field_config`).
4. Other `/settings/*` pages: appearance, biotrack, delivery (org config + zones + vehicles + drivers separately, F2), dosages, dutchie, fees, inventory-statuses, labels, limits, package-formats, printers, product-fields, receipts, registers, rooms, taxes.
5. `/registers/configure/*` (8 tabs) and `/customers/configure/*` pages.
6. `/products/configure/*` (8 tabs), `/marketing/loyalty`, `/customers/referrals`, marketing configure surfaces.
7. Entity-CRUD pages (rooms, taxes, fees, printers, zones…): audit the CONFIG FIELDS of the entities (e.g. `max_delivery_value`, `tax rate applies_to`) — a row per field whose value should change runtime behavior; plain identity fields (name, address) get one collective row.

## Row identity (R2-F1)
One row per (control × writer surface): Surface A = 46 rows, Surface B = 13 rows, registry-only paths = additional rows (UNEXPOSED), other surfaces per their own controls. Keys appearing on multiple surfaces (e.g. `auto_deduct_on_sale`) get one row PER surface; the concept matrix links duplicates. The doc states computed row counts per surface.

## Verdict taxonomy (F3, F4, R2-F2, R2-F3 — single primary verdict, deterministic precedence, nuance in fixed columns)
Systemic write-path defects shared by a whole surface (Surface A whole-blob clobber; Surface B error swallowing) are recorded ONCE in the findings section and reflected per-row in the `Writer OK?` column — they do NOT set the primary verdict, so they cannot mask DRIFT/PLACEHOLDER counts (R2-F3).
Surface-level classifications for non-writer pages: **REDIRECT/ALIAS** (page only redirects, e.g. `/settings/dosages`, `/registers/configure` index) and **READ-ONLY** (renders data without writes, e.g. `/settings/locations` list). These get one surface-level row each, no per-control rows (R2-F2).
Primary verdict, first match wins:
1. **BROKEN-WRITE** — a write defect SPECIFIC to this control's own path (not the surface-wide systemic defects above); cite the defect.
2. **DRIFT** — written under a key/store that no runtime consumer reads, while an equivalent concept IS consumed under a different key/store/scope. Cite both sides.
3. **WIRED** — complete chain: writer → stored value → loader → behavioral branch → reachable production entry point (terminal, storefront, API, cron, printing, sync). Cite the branch file:line. Settings whose intended effect IS display (receipt fields, POS visibility) are WIRED if the display actually changes. (F4, F16.)
4. **PARTIAL** — chain exists but is incomplete/gated/dead-ended; Notes must say which link is missing.
5. **PLACEHOLDER** — persists but no consumer outside settings UIs/APIs.
6. **UNEXPOSED** — documented in registry, no UI writer.
7. **STATIC/REFERENCE** — page renders hardcoded content, nothing persisted (e.g. limits page if static).
Required columns: `Control | Surface | Store + scope (org/location/register/device) | Writer OK? | Runtime consumer (file:line) | Verdict | Default mismatch? | Notes`.

## Method (required)
1. Pin the audited commit SHA in the doc header. Record the pre-run `git status --porcelain` snapshot in the evidence appendix (F19).
2. Search with `git grep -n` (rg is NOT installed — F13). For nested JSONB paths (`receipt.show_sku` stored as nested object) search parent key AND leaf key separately (F12). Log every command + result count in an evidence ledger; negative results logged too (F5, F13).
3. Trace indirection: `getLocationSettings`, session/bootstrap payloads, Zustand stores, client fetches, AND background/cached paths — Dutchie cron, BioTrack sync, `public/sw.js` GET caching, `taxRateLoader` 5-min cache & invalidation (F15).
4. Scope tracing end-to-end (F9): a key consumed at a different scope than written (e.g. delivery page sends location_id, API ignores it and reads org config) is NOT WIRED — classify DRIFT or PARTIAL and note the scope break.
5. Writer validation (F8): confirm the write path actually persists and propagates errors (Surface B's `updateLocationSettings` ignores Supabase errors; its UI ignores the PUT response). Cross-surface clobber risk (Surface A posts whole blob back; register-configure does similar; APIs do non-transactional read-merge-upsert) must be documented (F14).
6. Default-drift check (F11): compare registry default vs UI initial render vs consumer fallback for every Surface A/B key (e.g. registry says `auto_print_receipt` default true; UI renders missing as false; security placeholder 90 vs registry 0).
7. Concept-level source-of-truth matrix (F7): for every concept stored in ≥2 places (receipt JSON vs `receipt_config` table; 3 auto-print variants incl. `registers.auto_print_receipts`; BioTrack JSON keys vs `biotrack_config.is_enabled`; online ordering JSON vs `locations.allows_online_orders`) map all stores + which one runtime actually uses.
8. Two-surfaces history: state facts only (Surface B introduced `6f34be0` 2026-03-30; Surface A + registry `ce398f4` 2026-04-01); label motive as inference (F18).

## Deliverable format (`SETTINGS-WIRING-AUDIT.md`)
- Header: audited commit SHA, method statement, static-audit limitation.
- Executive summary: verdict counts per surface; top-10 impact list ranked by rubric (F18): tier 1 compliance/legal (purchase limits, ID, BioTrack), tier 2 money (rounding, tax order, pricing, loyalty), tier 3 workflow, tier 4 cosmetic; within tier, order by blast radius (checkout > backoffice).
- Per-surface tables with the required columns.
- Concept-level source-of-truth matrix (F7).
- Cross-surface clobber & error-swallowing findings (F8, F14).
- Two-surfaces explanation (facts vs inference).
- Consolidation recommendation (F10): evidence-based. Evaluate Kane's stated preference (one global settings surface for all locations) against the actual scope map; if some stores are legitimately org/register/device-scoped, recommend the closest sound design (e.g. one settings hub, org-level defaults + per-location overrides) and say why. Include concrete key-migration map naming which page dies, which keys rename, which stores merge.
- Evidence appendix: command ledger, porcelain baseline, spot-check sample definition.

## Acceptance criteria
- AC-1: Every Surface A control (46 rows), Surface B control (13 rows), and registry-only path has exactly one verdict row per (control × surface); doc states computed row counts per surface and the audited SHA (F17, R2-F1).
- AC-2: Every key with an equivalent concept elsewhere appears in the source-of-truth matrix with all backing stores listed (F7).
- AC-3: Every surface in the inventory (§Surface inventory 1–7) has verdict rows per independently mutable control; entity-CRUD pages per §7 rule (F1, F2).
- AC-4: Every WIRED verdict cites a behavioral branch file:line reachable from a production entry point, not merely a read (F16); every PLACEHOLDER verdict has ledger evidence incl. the exact command (F5).
- AC-5: Every Surface A/B row records writer-validation status and default-mismatch status (F8, F11).
- AC-6: Doc includes two-surfaces explanation (facts labeled vs inference), clobber/error findings, and the consolidation recommendation with key-migration map (F10, F14).
- AC-7: Post-run `git status --porcelain` equals recorded baseline + exactly `SETTINGS-WIRING-AUDIT.md` (F19).

## Gates (`.route/gates.txt`)
- Scope gate: porcelain diff vs baseline = only `SETTINGS-WIRING-AUDIT.md`.
- `npm run typecheck` green (regression tripwire only — doc can't affect it; a failure means environment drift, not the doc) (F19).
- Fable stratified spot-check (F18, R2-F3): deterministic selection from the completed manifest — within each stratum (WIRED, PLACEHOLDER, DRIFT, PARTIAL, other-surface, registry-only) sort rows alphabetically by control key and take the FIRST 2 (target 10+ total). If a stratum has fewer rows than its target, take all and reallocate the remainder to the next stratum alphabetically. Fable independently verifies each selected row against code before APPROVE.

## Round-1 findings NOT fully adopted (rationale)
- F4 multi-axis verdict matrix: rejected as primary format — Kane needs one answer per control. Adopted instead: deterministic precedence + fixed nuance columns.
- F5 runtime smoke tests per key: rejected for this run — static audit with stated limitation (A-3). Live verification is a follow-up.
- F18 stratified sample: adopted with fixed strata above rather than random selection (no RNG available; strata prevent cherry-picking).
