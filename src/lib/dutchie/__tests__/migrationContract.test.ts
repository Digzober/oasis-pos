import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260402160000_dutchie_loyalty_sync.sql'),
  'utf8',
)

describe('Phase B migration contract', () => {
  it('defines row-locked atomic loyalty RPCs and durable staging', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS dutchie_loyalty_staging')
    expect(migration).toContain('staging_complete BOOLEAN NOT NULL DEFAULT FALSE')
    expect(migration).toMatch(/apply_dutchie_loyalty_chunk[\s\S]*FOR UPDATE/)
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION adjust_loyalty_points/)
    expect(migration).toMatch(/ON CONFLICT[\s\S]*DO NOTHING/)
    expect(migration).toContain('delta := staged.balance - current_balance')
    expect(migration).toMatch(/delta := staged\.balance - current_balance[\s\S]*points_change[\s\S]*delta, staged\.balance/)
    expect(migration).toMatch(/adjust_loyalty_points[\s\S]*ORDER BY customer_id[\s\S]*FOR UPDATE/)
    expect(migration).toContain('loyalty_transactions_customer_run_uniq')
    expect(migration).not.toMatch(/dutchie_loyalty_staging[\s\S]{0,500}enrolled_at/)
  })

  it('widens every loyalty value and repairs dependent sale/void/return functions', () => {
    expect(migration).toMatch(/current_points TYPE NUMERIC\(12,2\)/)
    expect(migration).toMatch(/points_change TYPE NUMERIC\(12,2\)/)
    expect(migration).toContain("proname = 'create_sale_transaction'")
    expect(migration).toContain("proname = 'void_transaction'")
    expect(migration).toContain("proname = 'create_return_transaction'")
  })

  it('defines dual single-flight indexes and durable sync state', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS dutchie_sync_state')
    expect(migration).toContain('dutchie_sync_log_org_running_uniq')
    expect(migration).toContain('dutchie_sync_log_location_running_uniq')
    expect(migration).toContain('heartbeat_at')
  })

  it('uses service-role-only RPC execution and refreshes PostgREST', () => {
    expect(migration).toMatch(/REVOKE EXECUTE ON FUNCTION adjust_loyalty_points[\s\S]*FROM PUBLIC, anon, authenticated/)
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION adjust_loyalty_points[\s\S]*TO service_role/)
    expect(migration).toContain("NOTIFY pgrst, 'reload schema'")
  })
})
