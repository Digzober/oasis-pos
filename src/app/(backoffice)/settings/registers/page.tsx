'use client'
import LookupCrudPage from '@/components/backoffice/LookupCrudPage'
export default function RegistersPage() {
  return <LookupCrudPage title="Registers" apiPath="/api/registers" entityKey="registers"
    extraFields={[
      {
        key: 'auto_print_receipts', label: 'Receipt printing', type: 'select',
        options: [{ value: 'true', label: 'Always print' }, { value: 'false', label: 'Never print' }],
      },
      {
        key: 'auto_print_labels', label: 'Label printing', type: 'select',
        options: [{ value: 'true', label: 'Always print' }, { value: 'false', label: 'Never print' }],
      },
    ]} />
}
