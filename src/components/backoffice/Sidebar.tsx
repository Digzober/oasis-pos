'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Users, Megaphone, Truck, BarChart3, Settings, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface NavChild { label: string; href: string }
interface NavItem { label: string; href?: string; icon: React.ElementType; children?: NavChild[] }

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', icon: Package, children: [
    { label: 'Inventory', href: '/inventory' },
    { label: 'Catalog', href: '/products' },
    { label: 'Manifests', href: '/inventory/manifests' },
    { label: 'Purchase Orders', href: '/inventory/purchase-orders' },
    { label: 'Audits', href: '/inventory/audits' },
    { label: 'Journal', href: '/inventory/journal' },
    { label: 'Vendors', href: '/products/vendors' },
    { label: 'Brands', href: '/products/brands' },
    { label: 'Strains', href: '/products/strains' },
    { label: 'Tags', href: '/products/tags' },
    { label: 'Configure', href: '/products/configure' },
  ]},
  { label: 'Customers', icon: Users, children: [
    { label: 'All Customers', href: '/customers' },
    { label: 'Groups', href: '/customers/groups' },
    { label: 'Segments', href: '/customers/segments' },
    { label: 'Referrals', href: '/customers/referrals' },
    { label: 'Configure', href: '/customers/configure' },
  ]},
  { label: 'Employees', href: '/employees', icon: Users },
  { label: 'Marketing', icon: Megaphone, children: [
    { label: 'Discounts', href: '/marketing/discounts' },
    { label: 'Loyalty', href: '/marketing/loyalty' },
    { label: 'Campaigns', href: '/marketing/campaigns' },
    { label: 'Workflows', href: '/marketing/workflows' },
    { label: 'Events', href: '/marketing/events' },
    { label: 'Templates', href: '/marketing/templates' },
  ]},
  { label: 'Registers', icon: Settings, children: [
    { label: 'All Registers', href: '/settings/registers' },
    { label: 'Guestlist', href: '/registers/configure/guestlist' },
    { label: 'Cards', href: '/registers/configure/cards' },
  ]},
  { label: 'Delivery', href: '/delivery', icon: Truck },
  { label: 'Reports', icon: BarChart3, children: [
    { label: 'Transactions', href: '/reports/transactions' },
    { label: 'Sales', href: '/reports/sales' },
    { label: 'COGS', href: '/reports/cogs' },
    { label: 'Inventory', href: '/reports/inventory' },
    { label: 'Reconciliation', href: '/reports/reconciliation' },
    { label: 'Schedules', href: '/reports/schedules' },
  ]},
  { label: 'Settings', icon: Settings, children: [
    { label: 'Appearance', href: '/settings/appearance' },
    { label: 'Location Settings', href: '/settings/location-settings' },
    { label: 'Locations', href: '/settings/locations' },
    { label: 'Rooms', href: '/settings/rooms' },
    { label: 'Printers', href: '/settings/printers' },
    { label: 'BioTrack', href: '/settings/biotrack' },
    { label: 'Dutchie', href: '/settings/dutchie' },
    { label: 'Taxes', href: '/settings/taxes' },
    { label: 'Limits', href: '/settings/limits' },
    { label: 'Fees', href: '/settings/fees' },
    { label: 'Receipts', href: '/settings/receipts' },
    { label: 'Labels', href: '/settings/labels' },
    { label: 'Delivery', href: '/settings/delivery' },
  ]},
]

const activeItem = 'bg-accent-soft text-accent font-medium before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:bg-accent'

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Auto-expand active section
  useEffect(() => {
    void Promise.resolve().then(() => {
      for (const item of navigation) {
        if (item.children?.some(c => pathname?.startsWith(c.href))) {
          setExpanded(prev => new Set(prev).add(item.label))
        }
      }
    })
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
      'bg-surface border-r border-edge-strong flex flex-col shrink-0 transition-all duration-200 overflow-hidden',
      collapsed ? 'w-16' : 'w-60',
    )}>
      <nav className="flex-1 overflow-y-auto py-1">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = item.href ? isActive(item.href) : item.children?.some(c => isActive(c.href))
          const isExpanded = expanded.has(item.label)

          if (item.href) {
            return (
              <Link key={item.label} href={item.href}
                className={cn('relative flex h-8 items-center gap-2.5 px-3 text-[13px] transition-colors',
                  active ? activeItem : 'text-secondary hover:bg-raised/60 hover:text-primary')}>
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          }

          return (
            <div key={item.label}>
              <button onClick={() => toggle(item.label)}
                className={cn('relative flex h-8 w-full items-center gap-2.5 px-3 text-[13px] transition-colors',
                  active ? activeItem : 'text-secondary hover:bg-raised/60 hover:text-primary')}>
                <Icon size={16} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    <ChevronDown size={12} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                  </>
                )}
              </button>
              {!collapsed && isExpanded && item.children && (
                <div className="ml-6 border-l border-edge">
                  {item.children.map(child => (
                    <Link key={child.href} href={child.href}
                      className={cn('relative flex h-8 items-center pl-4 pr-2 text-xs transition-colors',
                        isActive(child.href) ? activeItem : 'text-secondary hover:bg-raised/60 hover:text-primary')}>
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
