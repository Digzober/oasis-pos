# Redesign Spec — HIGH-CONTRAST UTILITARIAN (Kane-selected 2026-07-14)

The current Phase C output is a flat token re-skin: surfaces melt into the bg, KPI cards are empty boxes, no density, no scan hierarchy. Fix it to an information-first, trader-terminal aesthetic: BRIGHT stepped surfaces, CRISP borders, DENSE layouts, minimal decoration, maximum scan speed. Same token architecture — retune values + tighten shared components; do NOT redo individual pages.

## 1. Retune oasis-dark (DEFAULT) tokens in src/app/globals.css
Goal: surfaces clearly SEPARATE from bg (currently #111715 on #0b0f0e = invisible). Brighter, stepped, crisp edges, higher text contrast. Utilitarian = borders not shadows; smaller radii.

Replace the :root/[data-theme=oasis-dark] block values with:
- --bg: #0a0f0d
- --surface: #141c19        (clearly lighter than bg)
- --surface-raised: #1c2723 (steps up again — visible layering)
- --surface-overlay: #243430
- --edge: #35473f           (VISIBLE crisp borders — key for scan separation)
- --edge-strong: #4f665b
- --text-primary: #f6fbf8
- --text-secondary: #cfdad4  (raise contrast)
- --text-muted: #9fb0a7 (verify AA >=4.5 on surface; nudge lighter if needed)
- --accent: #2fd968 (brighter emerald for pop); --accent-hover: #4ade80; --accent-fg: #04140a; --accent-soft: #133d26
- --success: #3ee87f / soft #133d26 ; --warning: #fbbf24 / soft #43310c ; --danger: #ff6b7d / soft #4a1620 ; --info: #5fb0ff / soft #102f52
- (all exact hex are STARTING points — adjust to pass check:theme AA, keep the high-contrast intent)
- Keep chart-1..6 but brighten slightly for dark bg.
- --ring: #2fd968
- Radii SMALLER (utilitarian): --radius-token-sm .1875rem, md .25rem, lg .375rem, xl .5rem
- Shadows MINIMAL (rely on borders): sm none/0 0 0, md 0 1px 0 rgb(0 0 0/.3), lg 0 2px 8px rgb(0 0 0/.35). Keep subtle.

Apply the same brightening logic to oasis-light (crisper edges, stronger text) and oasis-contrast (already high) — keep them AA. Re-run check:theme after.

## 2. KPICard.tsx (dashboard) + StatCard.tsx — REBUILD as real stat cards
Currently: label + value on a flat card. Make them dense, information-rich, scannable:
- Layout: compact card, p-3, border border-edge bg-surface rounded-[--radius-sm]. NO big empty height.
- Top row: tiny UPPERCASE label (11px, tracking-wide, text-muted) + small lucide icon (14px, text-muted) right-aligned.
- Value: 22px, font-bold, text-primary, tabular-nums, tight leading.
- Trend chip (when a delta is provided): inline pill, 11px, ▲/▼ + pct, text-success/text-danger on *-soft bg, rounded-sm px-1.5. If no delta data, omit (don't fake).
- Optional: thin baseline accent (2px left border in accent OR a 1px top hairline) to add crispness.
- Props: extend to accept optional `delta` (number|null), `icon` (ReactNode), `format`.
- Dashboard: wire the 5 KPI cards (TRANSACTIONS, GROSS, NET, CUSTOMERS, AVG CART) with an icon each; pass delta only if the data source has a comparison, else omit.

## 3. DataTable.tsx — DENSITY + scan hierarchy
- Header row: bg-raised, sticky, 11px UPPERCASE tracking-wide text-muted, py-2 px-3, border-b border-edge-strong.
- Body rows: h-9 (~36px), py-1.5 px-3, text-[13px] text-secondary, border-b border-edge (crisp 1px dividers between every row).
- Row hover: bg-raised/60. Selected: bg-accent-soft.
- Numeric columns: tabular-nums, right-aligned where money/qty.
- Zebra optional-off (crisp dividers are enough). Compact = more rows visible.

## 4. Card.tsx / Button.tsx / inputs / Sidebar / Header — tighten
- Card: default p-3 (from p-6), border-edge, radius-sm, bg-surface. Section header variant: 12px uppercase tracking-wide text-muted with bottom hairline.
- Button: h-8, px-3, text-[13px], radius-sm, font-medium. Primary bg-accent text-accent-fg hover:bg-accent-hover. Secondary bg-raised border-edge. Ghost transparent.
- Inputs/selects: h-9, text-[13px], bg-surface border-edge radius-sm, focus ring-[--ring].
- Sidebar: item h-8, text-[13px], px-3, active = bg-accent-soft text-accent + 2px left accent bar; icon 16px. Tighter vertical rhythm.
- Header: h-12, border-b border-edge-strong, bg-surface.

## Quality loop (MANDATORY — this is why it failed before)
After applying, the ORCHESTRATOR screenshots dashboard/inventory/products/customers/appearance via Playwright and visually critiques. Iterate until it reads as a deliberate high-contrast utilitarian tool, not a re-skin. Gates (typecheck/tests/check:theme/build) must stay green; check:theme AA must still pass for all 3 themes.
