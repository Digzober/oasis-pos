'use client'

import LookupCrudPage from '@/components/backoffice/LookupCrudPage'

export default function InventoryStatusesTab() {
  return (
    <LookupCrudPage
      title="Inventory Statuses"
      apiPath="/api/settings/inventory-statuses"
      entityKey="statuses"
    />
  )
}
