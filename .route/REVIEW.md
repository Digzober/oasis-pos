VERDICT: APPROVE
AC COVERAGE: 7/7
RUN: settings-wiring-audit — Fable review of SETTINGS-WIRING-AUDIT.md (Sol build, session 019f634e-0a9f-7d40-a97b-255f671bad62)

FABLE INDEPENDENT VERIFICATION (deterministic sample per PLAN v3 gate):
- V1 WIRED Dutchie `apiKey` — confirmed: syncEngine.ts client construction + api/dutchie/sync route; consistent with live Dutchie sync feature. PASS
- V2 WIRED Discounts `customer_types` — confirmed: discountLoader.ts:55 maps it; discountEvaluator branch cited. PASS (noted: loader takes only [0]; fidelity gap correctly captured in doc's top-10 #7)
- V3 PLACEHOLDER A `allow_partial_payments` — grep: only Surface A page + registry. PASS
- V4 PLACEHOLDER A `allow_offline_mode` — grep: only Surface A page + registry; offline workers unconditional. PASS
- V5 DRIFT B `auto_apply_discounts` — grep: single src hit (B page writer); runtime authority is discounts table via loader/evaluator, verified loader loads all active org discounts unconditionally. PASS
- V6 DRIFT A `auto_sync_biotrack` — verified transactionService.ts:278-281 fire-and-forget sync ignores the flag. PASS
- V7 PARTIAL Loyalty `accrual_rate` — verified transactionService.ts:233-236 queries loyalty_config with .eq('is_active',true).limit(1) and NO organization_id filter. Real cross-org defect. PASS
- V8 PARTIAL Discounts `application_method` — loader line 51 reads it only as fallback for discount_type. PASS
- V9 BROKEN-WRITE Print service `account_email` — ledger command + schema/UI mismatch documented. PASS (doc-level)
- V10/V11 UNEXPOSED `cfd_enabled`, `cfd_wallpaper_url` — grep: zero src hits, registry only. PASS
- Bonus: loader hardcodes is_recurring:false (discountLoader.ts:65) — matches doc claim independently.
- Row counts: Surface A = 46 rows, Surface B = 13 rows (counted from manifest). Matches AC-1.
- Two-surfaces history matches Fable's own git log (B: 6f34be0 2026-03-30; A+registry: ce398f4 2026-04-01).

GATES:
- Scope: porcelain = baseline + SETTINGS-WIRING-AUDIT.md only (+ .route artifacts written by Fable/output redirects, disclosed). PASS
- typecheck: PASS (Sol ran tsc --noEmit exit 0).
- AC-7 caveat disclosed in doc (build-audit.txt output redirect postdates baseline — Fable's artifact, accepted).

FINDINGS: none blocking. No fix round required.
