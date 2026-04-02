'use client'

import LookupCrudPage from '@/components/backoffice/LookupCrudPage'

export default function AdjustmentReasonsTab() {
  return (
    <LookupCrudPage
      title="Adjustment Reasons"
      apiPath="/api/settings/adjustment-reasons"
      entityKey="reasons"
    />
  )
}
