'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const CategoriesTab = dynamic(() => import('@/components/backoffice/configure/CategoriesTab'), { ssr: false })
const PricingTab = dynamic(() => import('@/components/backoffice/configure/PricingTab'), { ssr: false })
const FieldsTab = dynamic(() => import('@/components/backoffice/configure/FieldsTab'), { ssr: false })
const InventoryStatusesTab = dynamic(() => import('@/components/backoffice/configure/InventoryStatusesTab'), { ssr: false })
const AdjustmentReasonsTab = dynamic(() => import('@/components/backoffice/configure/AdjustmentReasonsTab'), { ssr: false })
const DosagesTab = dynamic(() => import('@/components/backoffice/configure/DosagesTab'), { ssr: false })
const PackingListsTab = dynamic(() => import('@/components/backoffice/configure/PackingListsTab'), { ssr: false })
const FormatsTab = dynamic(() => import('@/components/backoffice/configure/FormatsTab'), { ssr: false })

interface TabDef {
  key: string
  label: string
}

const TABS: TabDef[] = [
  { key: 'categories', label: 'Categories' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'fields', label: 'Fields' },
  { key: 'inventory-statuses', label: 'Inventory Statuses' },
  { key: 'inventory-adjustments', label: 'Inventory Adjustments' },
  { key: 'dosages', label: 'Dosages' },
  { key: 'packing-lists', label: 'Packing Lists' },
  { key: 'formats', label: 'Formats' },
]

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'categories':
      return <CategoriesTab />
    case 'pricing':
      return <PricingTab />
    case 'fields':
      return <FieldsTab />
    case 'inventory-statuses':
      return <InventoryStatusesTab />
    case 'inventory-adjustments':
      return <AdjustmentReasonsTab />
    case 'dosages':
      return <DosagesTab />
    case 'packing-lists':
      return <PackingListsTab />
    case 'formats':
      return <FormatsTab />
    default:
      return <CategoriesTab />
  }
}

function ConfigurePageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') ?? 'categories'

  const handleTabChange = (tabKey: string) => {
    router.push(`/products/configure?tab=${tabKey}`, { scroll: false })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-50">Configure</h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage product categories, pricing tiers, field visibility, and other catalog settings.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="mb-6 border-b border-gray-700">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Configure tabs">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <TabContent tab={activeTab} />
    </div>
  )
}

export default function ConfigurePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    }>
      <ConfigurePageInner />
    </Suspense>
  )
}
