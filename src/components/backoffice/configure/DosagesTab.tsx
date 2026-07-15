'use client'

import LookupCrudPage from '@/components/backoffice/LookupCrudPage'

export default function DosagesTab() {
  return (
    <LookupCrudPage
      title="Dosage Presets"
      apiPath="/api/settings/dosages"
      entityKey="dosages"
    />
  )
}
