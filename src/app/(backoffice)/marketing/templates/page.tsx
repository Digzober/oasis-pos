'use client'
import LookupCrudPage from '@/components/backoffice/LookupCrudPage'
export default function TemplatesPage() {
  return <LookupCrudPage title="Campaign Templates" apiPath="/api/templates" entityKey="templates"
    extraFields={[{ key: 'html_content', label: 'Body' }]} />
}
