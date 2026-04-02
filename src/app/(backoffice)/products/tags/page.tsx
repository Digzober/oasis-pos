'use client'

import LookupCrudPage from '@/components/backoffice/LookupCrudPage'

export default function ProductTagsPage() {
  return (
    <LookupCrudPage
      title="Product Tags"
      apiPath="/api/tags"
      entityKey="tags"
      extraFields={[
        { key: 'color', label: 'Color (hex)', type: 'text' },
      ]}
    />
  )
}
