'use client'
import LookupCrudPage from '@/components/backoffice/LookupCrudPage'

export default function BrandsPage() {
  return <LookupCrudPage title="Brands" apiPath="/api/brands" entityKey="brands" />
}
