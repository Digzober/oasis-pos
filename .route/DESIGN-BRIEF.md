# Phase C Design Brief — Mobbin-informed universal theme system

Source references (Mobbin, curated 2026-07-14) translated to concrete direction since Sol cannot see images.

## Design language (default theme = "oasis-dark")
Reference distillation:
- **Supabase Studio (dark admin):** calm near-black surfaces (not pure #000), low-chroma neutral borders, tight table density, restrained accent used only for primary actions + active nav. THIS is the backoffice anchor.
- **Lovable dashboard:** KPI stat cards with a label, large value, and a small trend chip (▲/▼ + %); soft card elevation; sidebar with icon+label, clear active state.
- **Fresha POS:** two-pane register — left product/search pane, right sticky cart/total pane with a single high-emphasis primary button ("Continue to payment"). Generous touch targets.
- **Klarna/Faire (storefront):** clean product grid, image-forward cards, quiet metadata, price emphasized. Editorial whitespace.
- **GitHub Appearance settings:** theme picker = row of preview cards (mini UI mock in each theme's colors) + accent-swatch row + active checkmark. THIS is the exact pattern for Settings → Appearance.

## Token architecture (Tailwind v4, already on @theme inline)
Semantic tokens ONLY — no raw palette in components. Three shipped themes prove switchability:
- `:root` / `[data-theme="oasis-dark"]` — DEFAULT. Near-black neutral surfaces, emerald primary (keep brand emerald-500/600 feel), decimal-tuned.
- `[data-theme="oasis-light"]` — warm-neutral light (off-white surfaces, not stark #fff), same emerald accent, AA contrast.
- `[data-theme="oasis-contrast"]` — high-contrast (proves the "new CSS block + 1 registry line = new theme" contract; AC-C3).

Token groups (CSS custom properties, mapped to utilities via @theme inline):
- Surfaces: --bg, --surface, --surface-raised, --surface-overlay
- Borders: --edge, --edge-strong
- Text: --text-primary, --text-secondary, --text-muted, --text-inverse
- Brand: --accent, --accent-hover, --accent-fg, --accent-soft
- Status: --success/-soft, --warning/-soft, --danger/-soft, --info/-soft
- Charts: --chart-1..6 (Recharts reads these, no hex)
- --ring (focus), --radius-sm/md/lg, --shadow-sm/md/lg

## Component restyle targets (pages inherit — do NOT redesign 102 pages)
Restyle SHARED components to the language above so every page updates for free:
DataTable, Button, Input/Select/SearchableSelect, Card, Modal/Dialog, StatCard (KPI — build if missing, Lovable pattern), Sidebar, BackofficeHeader, TerminalHeader, status Badge, toggle Switch, Tabs.

## Theme picker (Settings → Appearance)
GitHub-pattern: registry-driven card row, each card a mini-mock painted in that theme's tokens + label + active check. Reads from `src/lib/theme/registry.ts`. No-FOUC inline script in root layout sets data-theme before paint. Persist cookie + localStorage.

## Non-negotiables (from plan ACs)
- AC-C1: zero non-exempt palette/hex classes in src/app + src/components (check:theme gate).
- AC-C3: adding oasis-contrast touched ONLY globals.css + registry.ts (git-diff provable).
- AC-C4: AA contrast for text tokens, all 3 themes (script-computed, in AUDIT.md).
- Default look stays dark + emerald (brand continuity — Kane's established palette).
