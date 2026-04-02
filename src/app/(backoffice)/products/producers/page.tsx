'use client'
import LookupCrudPage from '@/components/backoffice/LookupCrudPage'

export default function ProducersPage() {
  return <LookupCrudPage
    title="Producers"
    apiPath="/api/producers"
    entityKey="producers"
    extraFields={[
      { key: 'license_number', label: 'License #' },
      { key: 'contact_name', label: 'Contact' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'tel' },
    ]}
  />
}
