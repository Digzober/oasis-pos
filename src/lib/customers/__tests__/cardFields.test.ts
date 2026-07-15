import { describe, expect, it } from 'vitest'
import {
  CARD_FIELD_KEYS,
  buildCustomerCardPatch,
  getCardStatusKey,
  getVisibleCustomerCardDetails,
  isCustomerCardFieldVisible,
  type CustomerCardEntry,
} from '../cardFields'

const entry: CustomerCardEntry = {
  customer_name: 'Guest Name',
  customer_type: 'medical',
  source: 'online_delivery',
  notes: 'Call on arrival',
  checked_in_at: '2026-07-14T15:00:00.000Z',
  started_at: null,
  completed_at: null,
  workflow_event: 'ready_for_delivery',
  guestlist_statuses: { name: 'Ready' },
  customers: {
    first_name: 'Jane',
    last_name: 'Doe',
    nickname: 'JD',
    date_of_birth: '1990-04-20',
    address_line1: '123 Main St',
    address_line2: null,
    city: 'Albuquerque',
    state: 'NM',
    zip: '87101',
    customer_type: 'medical',
    drivers_license: 'DL123',
    drivers_license_expiration: '2030-01-01',
    medical_card_number: 'MMJ123',
    medical_card_expiration: '2027-01-01',
    pronoun: 'she/her',
    last_visit_at: '2026-06-01T12:00:00.000Z',
    visit_count: 0,
    opted_into_loyalty: true,
    customer_group_members: [{ customer_groups: { name: 'Veterans' } }],
  },
  registers: { name: 'Register 2' },
  online_orders: {
    status: 'confirmed',
    total: 42.5,
    order_number: 1234,
    order_type: 'delivery',
    scheduled_time: '2026-07-14T16:00:00.000Z',
    notes: 'Leave at desk',
    delivery_address: '500 Central Ave',
    online_order_lines: [{ id: 'line-1' }, { id: 'line-2' }],
    delivery_vehicles: { name: 'Van 1', inventory_room: { name: 'Delivery Room' } },
  },
}

describe('customer card field configuration', () => {
  it('resolves semantic card statuses from workflow state', () => {
    expect(getCardStatusKey({ ...entry, completed_at: '2026-07-14T17:00:00.000Z' })).toBe('completed')
    expect(getCardStatusKey({ ...entry, workflow_event: 'start_delivery_route' })).toBe('in_progress')
    expect(getCardStatusKey({ ...entry, workflow_event: 'default' })).toBe('checked_in')
    expect(getCardStatusKey({ ...entry, workflow_event: null, guestlist_statuses: null, source: 'online_pickup' })).toBe('online_order_placed')
    expect(getCardStatusKey({ ...entry, workflow_event: null, guestlist_statuses: null, source: 'walk_in' })).toBe('walk_in')
  })

  it('honors explicit visibility and established field defaults', () => {
    expect(isCustomerCardFieldVisible({}, 'ready', 'address')).toBe(true)
    expect(isCustomerCardFieldVisible({}, 'ready', 'pronouns')).toBe(false)
    expect(isCustomerCardFieldVisible({ ready: { address: false, pronouns: true } }, 'ready', 'address')).toBe(false)
    expect(isCustomerCardFieldVisible({ ready: { address: false, pronouns: true } }, 'ready', 'pronouns')).toBe(true)
  })

  it('renders every enabled card field when source data exists', () => {
    const config = { ready: Object.fromEntries(CARD_FIELD_KEYS.map((key) => [key, true])) }
    const details = getVisibleCustomerCardDetails(entry, config)

    expect(details.map(({ key }) => key)).toEqual(CARD_FIELD_KEYS)
    expect(details).toContainEqual({ key: 'discount_group', label: 'Discount Groups', value: 'Veterans' })
    expect(details).toContainEqual({ key: 'num_items_in_cart', label: 'Items', value: '2' })
    expect(details).toContainEqual({ key: 'room', label: 'Room', value: 'Delivery Room' })
  })

  it('builds a leaf-only patch for atomic card writes', () => {
    expect(buildCustomerCardPatch('ready', 'address', false)).toEqual({
      customer_card_fields: { ready: { address: false } },
    })
  })
})
