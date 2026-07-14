import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dbRowToFrontend, frontendToDbRow } from '../route'

describe('Dutchie config Phase B round-trip mapping', () => {
  it('round-trips transaction and loyalty toggles and timestamps', () => {
    const db = frontendToDbRow({
      syncEmployees: false,
      syncCustomers: false,
      syncProducts: false,
      syncInventory: false,
      syncRooms: false,
      syncTransactions: false,
      syncLoyalty: false,
    }, 'loc-1')
    expect(db).toMatchObject({
      sync_employees: false,
      sync_customers: false,
      sync_products: false,
      sync_inventory: false,
      sync_rooms: false,
      sync_transactions: false,
      sync_loyalty: false,
    })

    expect(dbRowToFrontend({
      ...db,
      last_synced_transactions_at: '2026-07-14T12:00:00.000Z',
    }, {
      is_enabled: false,
      last_synced_at: '2026-07-14T11:00:00.000Z',
      designated_location_id: 'loc-2',
    })).toMatchObject({
      syncTransactions: false,
      syncLoyalty: false,
      lastSyncedTransactionsAt: '2026-07-14T12:00:00.000Z',
      lastSyncedLoyaltyAt: '2026-07-14T11:00:00.000Z',
      designatedLoyaltyLocationId: 'loc-2',
    })
  })

  it('wires both toggles through the settings UI save payload and tiles', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/(backoffice)/settings/dutchie/page.tsx'),
      'utf8',
    )
    expect(source).toContain('syncTransactions: config.syncTransactions')
    expect(source).toContain('syncLoyalty: config.syncLoyalty')
    expect(source).toContain("key: 'loyalty'")
    expect(source).toContain('designatedLoyaltyLocationId')
  })
})
