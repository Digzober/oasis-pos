import { createSupabaseServerClient } from '@/lib/supabase/server'

const OWNERSHIP = {
  badges: { kind: 'organization' },
  brands: { kind: 'organization' },
  campaigns: { kind: 'organization' },
  campaign_templates: { kind: 'organization' },
  customer_groups: { kind: 'organization' },
  customers: { kind: 'organization' },
  delivery_zones: { kind: 'organization' },
  discounts: { kind: 'organization' },
  doctors: { kind: 'organization' },
  employees: { kind: 'organization' },
  events: { kind: 'organization' },
  label_templates: { kind: 'organization' },
  locations: { kind: 'organization' },
  manifests: { kind: 'organization' },
  permission_groups: { kind: 'organization' },
  producers: { kind: 'organization' },
  product_categories: { kind: 'organization' },
  products: { kind: 'organization' },
  qualifying_conditions: { kind: 'organization' },
  report_schedules: { kind: 'organization' },
  segments: { kind: 'organization' },
  strains: { kind: 'organization' },
  tags: { kind: 'organization' },
  vendors: { kind: 'organization' },
  workflows: { kind: 'organization' },

  guestlist_entries: { kind: 'location' },
  guestlist_statuses: { kind: 'location' },
  inventory_items: { kind: 'location' },
  inventory_audits: { kind: 'location' },
  online_orders: { kind: 'location' },
  order_sources: { kind: 'location' },
  printers: { kind: 'location' },
  registers: { kind: 'location' },
  rooms: { kind: 'location' },
  tax_rates: { kind: 'location' },
  transaction_reasons: { kind: 'location' },
  transactions: { kind: 'location' },

  loyalty_tiers: {
    kind: 'parent',
    parentColumn: 'loyalty_config_id',
    parentResource: 'loyalty_config',
  },
  loyalty_config: { kind: 'organization' },
  manifest_items: {
    kind: 'parent',
    parentColumn: 'manifest_id',
    parentResource: 'manifests',
  },
  inventory_audit_items: {
    kind: 'parent',
    parentColumn: 'audit_id',
    parentResource: 'inventory_audits',
  },
  printer_assignments: {
    kind: 'parent',
    parentColumn: 'printer_id',
    parentResource: 'printers',
  },
  product_images: {
    kind: 'parent',
    parentColumn: 'product_id',
    parentResource: 'products',
  },
  subrooms: {
    kind: 'parent',
    parentColumn: 'room_id',
    parentResource: 'rooms',
  },
} as const

export type OrgOwnedResource = keyof typeof OWNERSHIP

/**
 * Fail-closed tenant guard for service-role route handlers.
 *
 * It selects only identifiers needed to establish ownership, never sensitive
 * resource detail. Arrays are accepted so referenced IDs in mutation payloads
 * can be checked as one boundary. `expectedParentId` additionally binds a
 * child resource (for example a manifest item) to the parent in the URL.
 */
export async function assertOrgOwnership(
  resource: OrgOwnedResource,
  idOrIds: string | string[],
  organizationId: string,
  expectedParentId?: string,
  expectedLocationId?: string,
): Promise<boolean> {
  const ids = [...new Set(Array.isArray(idOrIds) ? idOrIds : [idOrIds])].filter(Boolean)
  if (ids.length === 0) return true

  try {
    const sb = await createSupabaseServerClient()
    return await ownsAll(sb, resource, ids, organizationId, expectedParentId, expectedLocationId)
  } catch {
    return false
  }
}

async function ownsAll(
  // Dynamic tables are intentionally constrained by OrgOwnedResource above.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  resource: OrgOwnedResource,
  ids: string[],
  organizationId: string,
  expectedParentId?: string,
  expectedLocationId?: string,
): Promise<boolean> {
  const spec = OWNERSHIP[resource]

  if (spec.kind === 'organization') {
    const { data, error } = await sb
      .from(resource)
      .select('id')
      .in('id', ids)
      .eq('organization_id', organizationId)

    return !error && hasEveryId(data, ids)
  }

  if (spec.kind === 'location') {
    let query = sb
      .from(resource)
      .select('id, location_id')
      .in('id', ids)
    if (expectedLocationId) query = query.eq('location_id', expectedLocationId)
    const { data, error } = await query

    if (error || !hasEveryId(data, ids)) return false

    const locationIds = [...new Set(
      (data as Array<{ location_id?: string | null }>).map((row) => row.location_id).filter(Boolean),
    )] as string[]
    if (locationIds.length === 0) return false

    const { data: locations, error: locationError } = await sb
      .from('locations')
      .select('id')
      .in('id', locationIds)
      .eq('organization_id', organizationId)

    return !locationError && hasEveryId(locations, locationIds)
  }

  let query = sb
    .from(resource)
    .select(`id, ${spec.parentColumn}`)
    .in('id', ids)

  if (expectedParentId) query = query.eq(spec.parentColumn, expectedParentId)
  const { data, error } = await query
  if (error || !hasEveryId(data, ids)) return false

  const parentIds = [...new Set(
    (data as Array<Record<string, string | null>>)
      .map((row) => row[spec.parentColumn])
      .filter(Boolean),
  )] as string[]
  if (parentIds.length === 0) return false

  return ownsAll(sb, spec.parentResource, parentIds, organizationId, undefined, expectedLocationId)
}

function hasEveryId(rows: unknown, ids: string[]): boolean {
  if (!Array.isArray(rows)) return false
  const found = new Set(rows.map((row) => (row as { id?: string }).id).filter(Boolean))
  return ids.every((id) => found.has(id))
}
