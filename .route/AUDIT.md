# Phase A Audit Ledger

Scope: Phase A only from `.route/PLAN.md` v4 (the committed v4 content retains a stale `PLAN v3` heading). Schema authority for all conformance decisions is `.route/schema-constraints.json`; `DATABASE-CONSTRAINTS.md` is supplementary.

## Findings and fixes

| ID | File:line | Class | Finding | Fix | Fix commit |
|---|---|---|---|---|---|
| S1 | `src/lib/auth/session.ts:79` | security / authorization | The unsigned `oasis-location-id` and `oasis-location-name` cookies replaced the signed session location without organization or employee-assignment validation, allowing cross-location and potentially cross-organization service-role access. | Validate the override against `locations.organization_id`; require an `employee_locations` assignment unless the signed role is admin/owner; derive the name from the database; fail closed to the signed location on missing rows/query errors. Added foreign-org rejection and assigned-manager tests. | `fix(auth): validate location override access` |

## Verification log

| Cluster | Command | Exit | Result |
|---|---|---:|---|
| A-SEC S1 red | `npx vitest run src/lib/auth/__tests__/session.test.ts src/app/api/settings/dutchie-config/__tests__/authorization.test.ts` | 1 | Expected failures reproduced: foreign-org override accepted, cookie name trusted, non-manager Dutchie access allowed. |
| A-SEC S1/S2 initial green | `npx vitest run src/lib/auth/__tests__/session.test.ts src/app/api/settings/dutchie-config/__tests__/authorization.test.ts` | 0 | 2 files, 3 tests passed. |
| A-SEC S1 baseline comparison | `npm run typecheck` | 1 | Known A1 baseline errors remain; no errors originate from the S1 implementation or its tests. Full repair is deferred to A1 per required phase order. |
