'use client'

import Link from 'next/link'
import {
  DollarSign,
  Receipt,
  Lock,
  TrendingUp,
  Package,
  GitCompareArrows,
  Clock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface ReportCard {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

interface ReportCategory {
  name: string
  reports: ReportCard[]
}

const categories: ReportCategory[] = [
  {
    name: 'Sales',
    reports: [
      {
        title: 'Sales Dashboard',
        description:
          'Revenue, transaction counts, hourly breakdown, payment methods, top products.',
        href: '/reports/sales',
        icon: DollarSign,
      },
      {
        title: 'Transaction Log',
        description:
          'Full transaction history with filters by date, type, status, and employee.',
        href: '/reports/transactions',
        icon: Receipt,
      },
    ],
  },
  {
    name: 'Cash',
    reports: [
      {
        title: 'Closing Report',
        description:
          'Cash drawer reconciliation — opening amount, expected vs actual cash, variance.',
        href: '/reports/closing',
        icon: Lock,
      },
    ],
  },
  {
    name: 'Inventory',
    reports: [
      {
        title: 'COGS Report',
        description:
          'Cost of goods sold, profit margins, and product profitability analysis.',
        href: '/reports/cogs',
        icon: TrendingUp,
      },
      {
        title: 'Inventory Report',
        description:
          'Current stock levels, valuations, room assignments, and testing status.',
        href: '/reports/inventory',
        icon: Package,
      },
    ],
  },
  {
    name: 'Compliance',
    reports: [
      {
        title: 'Reconciliation',
        description:
          'Compare local inventory counts against BioTrack state records.',
        href: '/reports/reconciliation',
        icon: GitCompareArrows,
      },
    ],
  },
  {
    name: 'Configuration',
    reports: [
      {
        title: 'Scheduled Reports',
        description: 'Manage automated report delivery via email.',
        href: '/reports/schedules',
        icon: Clock,
      },
    ],
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-50">Reports</h1>

      {categories.map((category) => (
        <section key={category.name}>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            {category.name}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {category.reports.map((report) => (
              <Link
                key={report.href}
                href={report.href}
                className="group rounded-xl border border-gray-700 bg-gray-800 p-5 transition-all hover:-translate-y-px hover:border-emerald-600"
              >
                <div className="flex items-start gap-3">
                  <report.icon className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" />
                  <div>
                    <h3 className="font-semibold text-gray-50">
                      {report.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {report.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
