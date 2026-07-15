import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  'supabase/migrations/20260715032105_guestlist_workflow_mappings.sql',
)

describe('guestlist workflow mapping migration', () => {
  const sql = readFileSync(migrationPath, 'utf8')

  it('creates a location-scoped, RLS-protected typed mapping table', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.guestlist_workflow_mappings')
    expect(sql).toContain('location_id UUID NOT NULL REFERENCES public.locations(id)')
    expect(sql).toContain('status_id UUID NOT NULL REFERENCES public.guestlist_statuses(id)')
    expect(sql).toContain('UNIQUE (location_id, workflow_event)')
    expect(sql).toContain('ALTER TABLE public.guestlist_workflow_mappings ENABLE ROW LEVEL SECURITY')
  })

  it('constrains workflow_event to exactly the approved ten values', () => {
    const check = sql.match(/workflow_event_check CHECK \(workflow_event IN \(([^)]+)\)\)/)?.[1]
    expect(check?.match(/'[^']+'/g)).toEqual([
      "'default'",
      "'preorder_notify'",
      "'online_pickup'",
      "'online_delivery'",
      "'in_store_order'",
      "'curbside'",
      "'drive_thru'",
      "'skipped_delivery'",
      "'ready_for_delivery'",
      "'start_delivery_route'",
    ])
  })

  it('removes all ten UI aliases and ten registry aliases from JSON', () => {
    const aliases = [
      'default_status_id',
      'preorder_notify_status_id',
      'online_pickup_status_id',
      'online_delivery_status_id',
      'in_store_order_status_id',
      'curbside_status_id',
      'drive_thru_status_id',
      'skipped_delivery_status_id',
      'ready_for_delivery_status_id',
      'start_delivery_route_status_id',
      'guestlist_default_status_id',
      'guestlist_preorder_notify_status_id',
      'guestlist_online_pickup_status_id',
      'guestlist_online_delivery_status_id',
      'guestlist_instore_order_status_id',
      'guestlist_curbside_status_id',
      'guestlist_drive_thru_status_id',
      'guestlist_skipped_delivery_status_id',
      'guestlist_ready_delivery_status_id',
      'guestlist_start_route_status_id',
    ]

    for (const alias of aliases) {
      expect(sql).toContain(`- '${alias}'`)
    }
  })
})
