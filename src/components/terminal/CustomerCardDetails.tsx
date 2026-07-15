'use client'

import {
  getVisibleCustomerCardDetails,
  type CustomerCardEntry,
  type CustomerCardFields,
  type CustomerCardFieldKey,
} from '@/lib/customers/cardFields'

const HEADER_FIELDS = new Set<CustomerCardFieldKey>(['customer_name', 'customer_type'])

export function CustomerCardDetails({
  entry,
  config,
  sourceInHeader = false,
  receivedInHeader = false,
}: {
  entry: CustomerCardEntry
  config: CustomerCardFields
  sourceInHeader?: boolean
  receivedInHeader?: boolean
}) {
  const details = getVisibleCustomerCardDetails(entry, config)
    .filter(({ key }) => !HEADER_FIELDS.has(key))
    .filter(({ key }) => !(sourceInHeader && key === 'order_source'))
    .filter(({ key }) => !(receivedInHeader && key === 'date_received'))
  if (details.length === 0) return null

  return (
    <dl className="mt-2 ml-7 grid grid-cols-1 gap-x-4 gap-y-1 text-[10px] sm:grid-cols-2">
      {details.map(({ key, label, value }) => (
        <div key={key} className="flex min-w-0 gap-1.5">
          <dt className="shrink-0 text-muted">{label}:</dt>
          <dd className="truncate text-secondary">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
