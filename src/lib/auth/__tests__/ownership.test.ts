import { describe, expect, it, vi } from 'vitest'

type Row = Record<string, string | null>

const rows: Record<string, Row[]> = {
  brands: [
    { id: 'brand-local', organization_id: 'org-local' },
    { id: 'brand-foreign', organization_id: 'org-foreign' },
  ],
  inventory_items: [
    { id: 'item-local', location_id: 'location-local' },
    { id: 'item-other-location', location_id: 'location-other' },
    { id: 'item-foreign', location_id: 'location-foreign' },
  ],
  locations: [
    { id: 'location-local', organization_id: 'org-local' },
    { id: 'location-other', organization_id: 'org-local' },
    { id: 'location-foreign', organization_id: 'org-foreign' },
  ],
  manifests: [
    { id: 'manifest-local', organization_id: 'org-local' },
    { id: 'manifest-foreign', organization_id: 'org-foreign' },
  ],
  manifest_items: [
    { id: 'manifest-item-local', manifest_id: 'manifest-local' },
    { id: 'manifest-item-foreign', manifest_id: 'manifest-foreign' },
  ],
}

function queryFor(table: string) {
  const filters: Array<(row: Row) => boolean> = []
  const query = {
    select: vi.fn(() => query),
    in: vi.fn((column: string, values: string[]) => {
      filters.push((row) => values.includes(row[column] ?? ''))
      return query
    }),
    eq: vi.fn((column: string, value: string) => {
      filters.push((row) => row[column] === value)
      return query
    }),
    then: (resolve: (value: { data: Row[]; error: null }) => void) => {
      resolve({ data: (rows[table] ?? []).filter((row) => filters.every((filter) => filter(row))), error: null })
    },
  }
  return query
}

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    from: vi.fn((table: string) => queryFor(table)),
  }),
}))

import { assertOrgOwnership } from '../ownership'

describe('assertOrgOwnership', () => {
  it('accepts direct organization ownership and rejects a foreign row', async () => {
    await expect(assertOrgOwnership('brands', 'brand-local', 'org-local')).resolves.toBe(true)
    await expect(assertOrgOwnership('brands', 'brand-foreign', 'org-local')).resolves.toBe(false)
  })

  it('binds location-owned resources to both organization and selected location', async () => {
    await expect(assertOrgOwnership('inventory_items', 'item-local', 'org-local', undefined, 'location-local')).resolves.toBe(true)
    await expect(assertOrgOwnership('inventory_items', 'item-other-location', 'org-local', undefined, 'location-local')).resolves.toBe(false)
    await expect(assertOrgOwnership('inventory_items', 'item-foreign', 'org-local')).resolves.toBe(false)
  })

  it('follows child ownership to its parent and binds the expected parent ID', async () => {
    await expect(assertOrgOwnership('manifest_items', 'manifest-item-local', 'org-local', 'manifest-local')).resolves.toBe(true)
    await expect(assertOrgOwnership('manifest_items', 'manifest-item-local', 'org-local', 'manifest-foreign')).resolves.toBe(false)
    await expect(assertOrgOwnership('manifest_items', 'manifest-item-foreign', 'org-local')).resolves.toBe(false)
  })
})
