'use client'
import LookupCrudPage from '@/components/backoffice/LookupCrudPage'
export default function FeesPage() {
  return <LookupCrudPage title="Fees & Donations" apiPath="/api/fees-donations" entityKey="fees"
    extraFields={[{ key: 'fee_type', label: 'Type' }, { key: 'amount', label: 'Amount' }]} />
}
