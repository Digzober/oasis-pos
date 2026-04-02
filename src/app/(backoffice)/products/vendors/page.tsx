'use client'
import LookupCrudPage from '@/components/backoffice/LookupCrudPage'

export default function VendorsPage() {
  return <LookupCrudPage
    title="Vendors"
    apiPath="/api/vendors"
    entityKey="vendors"
    extraFields={[
      { key: 'vendor_code', label: 'Vendor Code' },
      { key: 'license_number', label: 'License #' },
      { key: 'contact_name', label: 'Contact' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'postal_code', label: 'Postal Code' },
      { key: 'abbreviation', label: 'Abbreviation' },
    ]}
  />
}
