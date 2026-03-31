'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard', products: 'Products', inventory: 'Inventory',
  customers: 'Customers', employees: 'Employees', registers: 'Registers',
  marketing: 'Marketing', delivery: 'Delivery', reports: 'Reports',
  settings: 'Settings', brands: 'Brands', vendors: 'Vendors', strains: 'Strains',
  categories: 'Categories', tags: 'Tags', receive: 'Receive',
  adjustments: 'Adjustments', transfers: 'Transfers', journal: 'Journal',
  groups: 'Groups', segments: 'Segments', referrals: 'Referrals',
  discounts: 'Discounts', loyalty: 'Loyalty', campaigns: 'Campaigns',
  workflows: 'Workflows', events: 'Events', sales: 'Sales',
  transactions: 'Transactions', cogs: 'COGS', reconciliation: 'Reconciliation',
  locations: 'Locations', rooms: 'Rooms', taxes: 'Taxes',
  limits: 'Limits', fees: 'Fees & Donations', receipts: 'Receipts',
  labels: 'Labels', new: 'New', edit: 'Edit', permissions: 'Permissions',
  'time-clock': 'Time Clock', 'low-stock': 'Low Stock', schedules: 'Schedules',
}

function isUuid(s: string) { return /^[0-9a-f]{8}-/.test(s) }

export default function Breadcrumbs() {
  const pathname = usePathname()
  if (!pathname) return null

  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Array<{ label: string; href?: string }> = [{ label: 'Dashboard', href: '/dashboard' }]

  let path = ''
  for (const seg of segments) {
    path += `/${seg}`
    if (isUuid(seg)) {
      crumbs.push({ label: 'Detail', href: path })
    } else {
      crumbs.push({ label: LABELS[seg] ?? seg, href: path })
    }
  }

  if (crumbs.length <= 1) return null

  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-1 overflow-hidden">
      {crumbs.map((bc, i) => (
        <span key={i} className="flex items-center gap-1.5 min-w-0">
          {i > 0 && <span className="text-gray-600">/</span>}
          {i < crumbs.length - 1 && bc.href ? (
            <Link href={bc.href} className="hover:text-gray-300 truncate">{bc.label}</Link>
          ) : (
            <span className="text-gray-400 truncate">{bc.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
