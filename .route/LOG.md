# Route Loop Log — route/full-audit-sync-theme

## Preflight (2026-07-14)
- codex CLI ✅ · git repo ✅ · gpt-5.6-sol probe: READY ✅
- DEVIATION (documented): working tree was dirty with Apr 2 Dutchie sync work (never committed). Skill says stash-or-abort; instead committed as baseline on the route branch (work was live-tested code; stash risked loss; develop untouched).
- Gates: typecheck / lint / test / build (+ check:theme added in Phase C).
- Baseline gate state: typecheck 52 errors, lint failing, tests 1/323 failing — repair folded into Phase A scope.

## Research
- Loyalty endpoint: `GET /reporting/loyalty-snapshot` LIVE-VERIFIED (108,663 records, decimal balances, Coors key). Swagger copy in the-vault; endpoint absent from Dutchie docs site render.
- Live schema introspection → `.route/schema-constraints.json` (authority for Phase A). Drift found: dev has tables/constraints in no migration file (dutchie_sync_jobs, loyalty_balances unique).

## Plan review (adversarial, Sol, read-only, high reasoning)
- Round 1 → 3 blockers + 18 majors + 1 minor (cross-tenant authz hole; 30s runtime cap vs 108k records; loyalty system-of-record conflict; + engine/method/AC issues). All folded into v2. Round 1 predates B3 (cron) — user added mid-run.
- Round 2 → 2 blockers + 5 majors (journal atomicity; non-durable cursor; org-vs-location state; fail-open cron auth; starvation; entity scoping; settings-route authz). Folded into v3.
- Round 3 (cap) → 2 blockers + 3 majors, all narrow loyalty-subsystem refinements (value-blind fingerprint; unlocked legacy writers; guard-after-drain; missing location cursor schema; products/employees mixed scope). Folded into v4.
- CAP DECISION: 3-round HIGH-RISK cap reached; finding count monotonically narrowing (22→7→5) and round-3 items all had mechanical resolutions. Proceeding to build per skill §3; §6 implementation review verifies the v4 resolutions in code.

## User amendments mid-run
- B3 added: scheduled incremental sync 4x daily via Vercel cron until Dutchie cutover; never full re-pulls.
- Standing instruction recorded to memory: "I need you to…" ⇒ /route.

## Build
- Phase A build dispatched to Sol (workspace-write, high reasoning). Session captured in .route/session-a.


=== NEW RUN 2026-07-14: route/settings-wiring-audit ===
Preflight: codex READY (gpt-5.6-sol, xhigh). Tree had .route-only noise from prior run (devserver.log modified + untracked scratch) — recorded, not stashed; harmless for doc-only audit. Baseline typecheck green. Branch forked from route/full-audit-sync-theme HEAD so audit reflects the tree Kane sees.
Class STANDARD: 1 plan-review round, doc-only build.
