'use client'
import LookupCrudPage from '@/components/backoffice/LookupCrudPage'

const STRAIN_TYPE_OPTIONS = [
  { value: 'indica', label: 'Indica' },
  { value: 'sativa', label: 'Sativa' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'cbd', label: 'CBD' },
]

export default function StrainsPage() {
  return <LookupCrudPage
    title="Strains"
    apiPath="/api/strains"
    entityKey="strains"
    extraFields={[
      { key: 'strain_type', label: 'Type', type: 'select' },
      { key: 'abbreviation', label: 'Abbreviation' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ]}
    filters={[
      { key: 'strain_type', label: 'Type', options: STRAIN_TYPE_OPTIONS },
    ]}
  />
}
