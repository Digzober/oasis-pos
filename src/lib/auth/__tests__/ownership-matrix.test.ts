import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROUTES = [
  'badges/[id]/members',
  'brands/[id]',
  'campaigns/[id]',
  'campaigns/[id]/analytics',
  'campaigns/[id]/recipients',
  'campaigns/[id]/schedule',
  'categories/[id]',
  'customer-groups/[id]/members/bulk',
  'customers/[id]/badges',
  'customers/[id]/groups',
  'customers/[id]/loyalty/history',
  'customers/[id]/transaction-history',
  'delivery/zones/[id]',
  'discounts/[id]',
  'discounts/[id]/duplicate',
  'employees/[id]',
  'employees/[id]/permissions',
  'employees/[id]/pin',
  'events/[id]',
  'inventory/[id]/adjust',
  'inventory/[id]/move',
  'inventory/audits/[id]/items',
  'inventory/items/[id]/history',
  'inventory/items/[id]/transactions',
  'labels/templates/[id]',
  'locations/[id]',
  'manifests/[id]',
  'manifests/[id]/export',
  'manifests/[id]/history',
  'manifests/[id]/items',
  'manifests/[id]/items/[itemId]',
  'manifests/[id]/receive',
  'manifests/[id]/reopen',
  'manifests/[id]/send',
  'permission-groups/[id]',
  'producers/[id]',
  'products/[id]/analytics',
  'products/[id]/images',
  'products/[id]/label-settings',
  'products/[id]/price-history',
  'products/[id]/tags',
  'registers/[id]',
  'registers/configure/guestlist-entries/[id]',
  'registers/configure/guestlist-statuses/[id]',
  'reports/schedules/[id]',
  'reports/transactions/[id]',
  'rooms/[id]',
  'segments/[id]',
  'settings/printers/[id]',
  'settings/printers/[id]/assignments',
  'strains/[id]',
  'tags/[id]',
  'tax-rates/[id]',
  'templates/[id]',
  'templates/[id]/preview',
  'transactions/[id]/void',
  'vendors/[id]',
  'workflows/[id]',
  'workflows/[id]/executions',
] as const

describe('S5 tenant-ownership matrix', () => {
  it('places the shared ownership boundary in every formerly flagged handler', () => {
    const missing = ROUTES.flatMap((route) => {
      const source = readFileSync(join(process.cwd(), 'src', 'app', 'api', route, 'route.ts'), 'utf8')
      const starts = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)]
      return starts.flatMap((match, index) => {
        const start = match.index ?? 0
        const end = starts[index + 1]?.index ?? source.length
        return source.slice(start, end).includes('assertOrgOwnership(')
          ? []
          : [`${route}#${match[1]}`]
      })
    })

    expect(missing).toEqual([])
  })
})
