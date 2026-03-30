'use client'
import LookupCrudPage from '@/components/backoffice/LookupCrudPage'

export default function StrainsPage() {
  return <LookupCrudPage
    title="Strains"
    apiPath="/api/strains"
    entityKey="strains"
    extraFields={[{ key: 'strain_type', label: 'Type' }]}
  />
}
