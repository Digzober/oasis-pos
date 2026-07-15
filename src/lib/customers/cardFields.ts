export const CARD_FIELD_KEYS = [
  'address', 'customer_name', 'date_received', 'discount_group',
  'drivers_license_number', 'loyal_vs_non_loyal', 'medical_card_id', 'nickname',
  'order_source', 'payment_status', 'register', 'state', 'total_value_in_cart',
  'transaction_reference', 'customer_dob', 'customer_type', 'delivery_vehicle',
  'drivers_license_exp', 'last_purchase_date', 'med_card_exp', 'new_vs_existing',
  'num_items_in_cart', 'order_type', 'pronouns', 'room', 'time_window',
  'transaction_notes',
] as const

export type CustomerCardFieldKey = typeof CARD_FIELD_KEYS[number]
export type CustomerCardStatusKey =
  | 'online_order_placed'
  | 'walk_in'
  | 'checked_in'
  | 'in_progress'
  | 'ready'
  | 'completed'

export const CARD_STATUS_KEYS: CustomerCardStatusKey[] = [
  'online_order_placed', 'walk_in', 'checked_in', 'in_progress', 'ready', 'completed',
]

export type CustomerCardFields = Record<string, Partial<Record<CustomerCardFieldKey, boolean>>>

interface CustomerCardCustomer {
  first_name: string | null
  last_name: string | null
  nickname: string | null
  date_of_birth: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  customer_type: string
  drivers_license: string | null
  drivers_license_expiration: string | null
  medical_card_number: string | null
  medical_card_expiration: string | null
  pronoun: string | null
  last_visit_at: string | null
  visit_count: number
  opted_into_loyalty: boolean | null
  customer_group_members: Array<{ customer_groups: { name: string } | null }>
}

interface CustomerCardOrder {
  status: string
  total: number
  order_number: number
  order_type: string
  scheduled_time: string | null
  notes: string | null
  delivery_address: string | null
  online_order_lines: Array<{ id: string }>
  delivery_vehicles: {
    name: string
    inventory_room: { name: string } | null
  } | null
}

export interface CustomerCardEntry {
  customer_name: string | null
  customer_type: string | null
  source: string
  notes: string | null
  checked_in_at: string
  started_at: string | null
  completed_at: string | null
  workflow_event?: string | null
  guestlist_statuses: { id?: string; name: string; color?: string | null } | null
  customers: CustomerCardCustomer | null
  registers: { name: string } | null
  online_orders: CustomerCardOrder | null
}

export interface CustomerCardDetail {
  key: CustomerCardFieldKey
  label: string
  value: string
}

const FIELD_DEFAULTS: Record<CustomerCardFieldKey, boolean> = Object.fromEntries(
  CARD_FIELD_KEYS.map((key) => [
    key,
    !['drivers_license_number', 'pronouns', 'transaction_notes'].includes(key),
  ]),
) as Record<CustomerCardFieldKey, boolean>

const FIELD_LABELS: Record<CustomerCardFieldKey, string> = {
  address: 'Address', customer_name: 'Customer', date_received: 'Received',
  discount_group: 'Discount Groups', drivers_license_number: "Driver's License",
  loyal_vs_non_loyal: 'Loyalty', medical_card_id: 'MMJ ID', nickname: 'Nickname',
  order_source: 'Order Source', payment_status: 'Order Status', register: 'Register',
  state: 'State', total_value_in_cart: 'Cart Total', transaction_reference: 'Reference',
  customer_dob: 'DOB', customer_type: 'Customer Type', delivery_vehicle: 'Vehicle',
  drivers_license_exp: 'ID Expires', last_purchase_date: 'Last Purchase',
  med_card_exp: 'MMJ Expires', new_vs_existing: 'Customer', num_items_in_cart: 'Items',
  order_type: 'Order Type', pronouns: 'Pronouns', room: 'Room', time_window: 'Window',
  transaction_notes: 'Notes',
}

const WORKFLOW_CARD_STATUSES: Record<string, CustomerCardStatusKey> = {
  default: 'checked_in',
  preorder_notify: 'online_order_placed',
  online_pickup: 'online_order_placed',
  online_delivery: 'online_order_placed',
  in_store_order: 'walk_in',
  curbside: 'walk_in',
  drive_thru: 'walk_in',
  skipped_delivery: 'completed',
  ready_for_delivery: 'ready',
  start_delivery_route: 'in_progress',
}

export function getCardStatusKey(entry: CustomerCardEntry): CustomerCardStatusKey {
  if (entry.completed_at) return 'completed'
  if (entry.started_at) return 'in_progress'
  const configuredStatus = entry.workflow_event
    ? WORKFLOW_CARD_STATUSES[entry.workflow_event]
    : undefined
  if (configuredStatus) return configuredStatus
  if (entry.source.startsWith('online_')) return 'online_order_placed'
  return 'walk_in'
}

export function isCustomerCardFieldVisible(
  config: CustomerCardFields,
  status: CustomerCardStatusKey,
  field: CustomerCardFieldKey,
): boolean {
  return config[status]?.[field] ?? FIELD_DEFAULTS[field]
}

function customerName(entry: CustomerCardEntry): string {
  const name = [entry.customers?.first_name, entry.customers?.last_name].filter(Boolean).join(' ')
  return name || entry.customer_name || 'Unknown'
}

function customerAddress(entry: CustomerCardEntry): string | null {
  if (entry.online_orders?.delivery_address) return entry.online_orders.delivery_address
  const customer = entry.customers
  if (!customer) return null
  const locality = [customer.city, customer.state, customer.zip].filter(Boolean).join(', ')
  return [customer.address_line1, customer.address_line2, locality].filter(Boolean).join(', ') || null
}

function groupNames(entry: CustomerCardEntry): string | null {
  const names = entry.customers?.customer_group_members
    .map(({ customer_groups }) => customer_groups?.name)
    .filter((name): name is string => Boolean(name)) ?? []
  return names.join(', ') || null
}

function cardValue(entry: CustomerCardEntry, key: CustomerCardFieldKey): string | null {
  const customer = entry.customers
  const order = entry.online_orders
  const values: Record<CustomerCardFieldKey, string | null> = {
    address: customerAddress(entry), customer_name: customerName(entry),
    date_received: entry.checked_in_at, discount_group: groupNames(entry),
    drivers_license_number: customer?.drivers_license ?? null,
    loyal_vs_non_loyal: customer ? (customer.opted_into_loyalty ? 'Loyal' : 'Non-loyal') : null,
    medical_card_id: customer?.medical_card_number ?? null, nickname: customer?.nickname ?? null,
    order_source: entry.source.replaceAll('_', ' '), payment_status: order?.status ?? null,
    register: entry.registers?.name ?? null, state: customer?.state ?? null,
    total_value_in_cart: order ? `$${order.total.toFixed(2)}` : null,
    transaction_reference: order ? String(order.order_number) : null,
    customer_dob: customer?.date_of_birth ?? null,
    customer_type: entry.customer_type ?? customer?.customer_type ?? null,
    delivery_vehicle: order?.delivery_vehicles?.name ?? null,
    drivers_license_exp: customer?.drivers_license_expiration ?? null,
    last_purchase_date: customer?.last_visit_at ?? null,
    med_card_exp: customer?.medical_card_expiration ?? null,
    new_vs_existing: customer ? (customer.visit_count === 0 ? 'New' : 'Existing') : null,
    num_items_in_cart: order ? String(order.online_order_lines.length) : null,
    order_type: order?.order_type ?? null, pronouns: customer?.pronoun ?? null,
    room: order?.delivery_vehicles?.inventory_room?.name ?? null,
    time_window: order?.scheduled_time ?? null,
    transaction_notes: entry.notes ?? order?.notes ?? null,
  }
  return values[key]
}

export function getVisibleCustomerCardDetails(
  entry: CustomerCardEntry,
  config: CustomerCardFields,
): CustomerCardDetail[] {
  const status = getCardStatusKey(entry)
  return CARD_FIELD_KEYS.flatMap((key) => {
    if (!isCustomerCardFieldVisible(config, status, key)) return []
    const value = cardValue(entry, key)
    return value ? [{ key, label: FIELD_LABELS[key], value }] : []
  })
}

export function buildCustomerCardPatch(
  status: CustomerCardStatusKey,
  field: CustomerCardFieldKey,
  value: boolean,
) {
  return { customer_card_fields: { [status]: { [field]: value } } }
}
