'use client'

import LookupCrudPage from '@/components/backoffice/LookupCrudPage'

export default function DosagesTab() {
  return (
    <LookupCrudPage
      title="Dosage Presets"
      apiPath="/api/settings/dosages"
      entityKey="dosages"
      extraFields={[
        { key: 'thc_mg', label: 'THC (mg)', type: 'number' },
        { key: 'cbd_mg', label: 'CBD (mg)', type: 'number' },
        { key: 'serving_size', label: 'Serving Size' },
      ]}
    />
  )
}
