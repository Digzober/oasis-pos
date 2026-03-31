'use client'

import Link from 'next/link'
import type { DashboardKPIs } from '@/lib/services/dashboardService'

export function DashboardAlerts({ kpis }: { kpis: DashboardKPIs }) {
  const alerts: Array<{ icon: string; message: string; href: string; color: string }> = []

  if (kpis.low_stock_count > 0) alerts.push({ icon: '⚠', message: `${kpis.low_stock_count} low stock items`, href: '/reports/inventory', color: 'text-amber-400' })
  if (kpis.open_drawers > 0) alerts.push({ icon: '💰', message: `${kpis.open_drawers} drawer${kpis.open_drawers > 1 ? 's' : ''} still open`, href: '/settings/registers', color: 'text-amber-400' })
  if (kpis.pending_online_orders > 0) alerts.push({ icon: '🛒', message: `${kpis.pending_online_orders} pending online order${kpis.pending_online_orders > 1 ? 's' : ''}`, href: '/orders', color: 'text-blue-400' })
  if (kpis.total_voids > 0) alerts.push({ icon: '❌', message: `${kpis.total_voids.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} in voided transactions`, href: '/reports/transactions', color: 'text-red-400' })
  if (kpis.total_returns > 0) alerts.push({ icon: '↩', message: `${kpis.total_returns.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} in returns`, href: '/reports/transactions', color: 'text-amber-400' })

  if (alerts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">Alerts</h3>
        <p className="text-sm text-emerald-400">All clear — no issues</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">Alerts ({alerts.length})</h3>
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <Link key={i} href={a.href} className={`flex items-center gap-2 text-sm ${a.color} hover:brightness-125 transition-all`}>
            <span>{a.icon}</span>
            <span>{a.message}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
