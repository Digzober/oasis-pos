'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Cookies from 'js-cookie'
import { LayoutDashboard, Package, Warehouse, Users, Monitor, Megaphone, Truck, BarChart3, Settings, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface NavChild { label: string; href: string }
interface NavItem { label: string; href?: string; icon: React.ElementType; children?: NavChild[] }

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', icon: Package, children: [
    { label: 'Catalog', href: '/products' }, { label: 'Categories', href: '/products/categories' },
    { label: 'Brands', href: '/products/brands' }, { label: 'Vendors', href: '/products/vendors' },
    { label: 'Strains', href: '/products/strains' },
  ]},
  { label: 'Inventory', icon: Warehouse, children: [
    { label: 'Current Stock', href: '/inventory' }, { label: 'Receive', href: '/inventory/receive' },
    { label: 'Adjustments', href: '/inventory/adjustments' }, { label: 'Transfers', href: '/inventory/transfers' },
  ]},
  { label: 'Customers', icon: Users, children: [
    { label: 'All Customers', href: '/customers' }, { label: 'Segments', href: '/customers/segments' },
    { label: 'Referrals', href: '/customers/referrals' },
  ]},
  { label: 'Employees', href: '/employees', icon: Users },
  { label: 'Marketing', icon: Megaphone, children: [
    { label: 'Campaigns', href: '/marketing/campaigns' }, { label: 'Events', href: '/marketing/events' },
  ]},
  { label: 'Delivery', href: '/delivery', icon: Truck },
  { label: 'Reports', icon: BarChart3, children: [
    { label: 'Transactions', href: '/reports/transactions' }, { label: 'Sales', href: '/reports/sales' },
    { label: 'COGS', href: '/reports/cogs' }, { label: 'Inventory', href: '/reports/inventory' },
    { label: 'Reconciliation', href: '/reports/reconciliation' }, { label: 'Schedules', href: '/reports/schedules' },
  ]},
  { label: 'Settings', icon: Settings, children: [
    { label: 'Locations', href: '/settings/locations' }, { label: 'Registers', href: '/settings/registers' },
    { label: 'Rooms', href: '/settings/rooms' }, { label: 'Taxes', href: '/settings/taxes' },
    { label: 'Limits', href: '/settings/limits' }, { label: 'Fees', href: '/settings/fees' },
    { label: 'Receipts', href: '/settings/receipts' }, { label: 'Labels', href: '/settings/labels' },
    { label: 'Delivery', href: '/settings/delivery' },
  ]},
]

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Auto-expand active section
  useEffect(() => {
    for (const item of navigation) {
      if (item.children?.some(c => pathname?.startsWith(c.href))) {
        setExpanded(prev => new Set(prev).add(item.label))
      }
    }
  }, [pathname])

  const toggle = (label: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label); else next.add(label)
      return next
    })
  }

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  return (
    <aside className={cn(
      'bg-gray-800 border-r border-gray-700 flex flex-col shrink-0 transition-all duration-200 overflow-hidden',
      collapsed ? 'w-16' : 'w-60',
    )}>
      <nav className="flex-1 py-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = item.href ? isActive(item.href) : item.children?.some(c => isActive(c.href))
          const isExpanded = expanded.has(item.label)

          if (item.href) {
            return (
              <Link key={item.label} href={item.href}
                className={cn('flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                  active ? 'bg-gray-700 text-emerald-400 font-medium' : 'text-gray-300 hover:bg-gray-700/50 hover:text-gray-50')}>
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          }

          return (
            <div key={item.label}>
              <button onClick={() => toggle(item.label)}
                className={cn('w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                  active ? 'text-emerald-400' : 'text-gray-300 hover:bg-gray-700/50 hover:text-gray-50')}>
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    <ChevronDown size={14} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                  </>
                )}
              </button>
              {!collapsed && isExpanded && item.children && (
                <div className="ml-7 border-l border-gray-700">
                  {item.children.map(child => (
                    <Link key={child.href} href={child.href}
                      className={cn('block pl-4 py-1.5 text-xs transition-colors',
                        isActive(child.href) ? 'text-emerald-400 font-medium' : 'text-gray-400 hover:text-gray-200')}>
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
