# Fable Structured Review — route/full-audit-sync-theme

VERDICT: APPROVE (with 1 minor fix applied, 2 minors noted as follow-ups)
AC COVERAGE: 30/30 met (see final report)
Scope reviewed: git diff aba6ea6..HEAD -- src/ supabase/ (341 files). Sol's automated review pass derailed into an unrelated UI-audit skill and produced no usable findings; this is Fable's own authoritative diff review per route §6, plus the live DB verification already recorded in AUDIT.md.

## High-risk files reviewed in depth
- src/lib/auth/ownership.ts — SOLID. All three modes (organization/location/parent) correctly bind resource → org; hasEveryId prevents partial-match bypass; fail-closed on error. Empty-id set returns true (safe for [id] routes, param always present).
- src/lib/auth/session.ts — SOLID. Location override validated against org membership + employee_locations (admin/owner exempt); fails closed to signed session location.
- src/lib/auth/orderCapability.ts — timing-safe HMAC capability for public order links.
- src/lib/dutchie/syncLease.ts — SOLID. Stale-reap + unique-index insert = real DB single-flight; heartbeat/complete guarded on status='running'.
- src/lib/dutchie/loyaltySync.ts — SOLID + LIVE-VERIFIED. Match-guard before apply; deadline-aware drain; checkpoint only on full drain; durable fingerprint resume without re-hitting rate-limited API.
- src/lib/dutchie/cronRunner.ts — SOLID. One work item per org for org-wide entities; loyalty ≤once/20h; deadline threaded; skip-virgin; conflict-safe.
- src/lib/theme/ThemeProvider.tsx + registry.ts — SOLID. useSyncExternalStore, cross-tab storage sync, cookie+localStorage, no-FOUC bootstrap.
- Theme codemod (157 files) — CLEAN. No dynamic template-string color construction survived; status→color maps converted to semantic variants (bg-success-soft/text-success).
- Migration 20260402160000 RPCs — LIVE-VERIFIED on 50 real Dutchie customers (decimals exact, delta journaling, idempotency, atomic adjust).

## Findings
- F1 [minor→FIXED] loyaltySync.ts:142 — resume lookup picks ANY complete-unapplied staging run (no freshness bound), so a run that left stale staging (guard-fail or crash) could later apply day-old balances instead of fetching fresh. Rare on a healthy system (85% customer match), but a real edge. Fix: bound resume to recent staging + purge stale complete-unapplied rows.
- F2 [minor, noted] cronRunner.ts:203 — a non-conflict throw from syncEntity aborts the whole cron run. syncEntity catches its own errors internally, so this only fires on infra failure (DB down) that would affect all items anyway; rotation recovers next run. By-design, no change.
- F3 [minor, noted] loyaltySync.ts:242 — secondary last_synced_loyalty_at write filters by location_id only; harmless redundancy since dutchie_sync_state is authoritative.

No blocker or major findings. Security surface (the round-1/round-2 blocker concerns) verified closed in code.
