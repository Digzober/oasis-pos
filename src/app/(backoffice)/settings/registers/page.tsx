'use client'
import LookupCrudPage from '@/components/backoffice/LookupCrudPage'
export default function RegistersPage() {
  return <LookupCrudPage title="Registers" apiPath="/api/registers" entityKey="registers"
    extraFields={[{ key: 'auto_print_receipts', label: 'Auto Print' }]} />
}
