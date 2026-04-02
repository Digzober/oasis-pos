'use client'

import { useEffect } from 'react'
import { ShoppingCart, RotateCcw, ClipboardList, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TerminalTab = 'sale' | 'returns' | 'orders' | 'customers'

interface Props {
  activeTab: TerminalTab
  onTabChange: (tab: TerminalTab) => void
  orderCount?: number
}

const TABS: Array<{ key: TerminalTab; label: string; icon: LucideIcon; shortcut: string }> = [
  { key: 'sale', label: 'Sale', icon: ShoppingCart, shortcut: 'F1' },
  { key: 'returns', label: 'Returns', icon: RotateCcw, shortcut: 'F2' },
  { key: 'orders', label: 'Orders', icon: ClipboardList, shortcut: 'F3' },
  { key: 'customers', label: 'Customers', icon: Users, shortcut: 'F4' },
]

export default function TerminalTabBar({ activeTab, onTabChange, orderCount = 0 }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); onTabChange('sale') }
      if (e.key === 'F2') { e.preventDefault(); onTabChange('returns') }
      if (e.key === 'F3') { e.preventDefault(); onTabChange('orders') }
      if (e.key === 'F4') { e.preventDefault(); onTabChange('customers') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onTabChange])

  return (
    <div className="flex items-center bg-gray-900/80 backdrop-blur-sm border-b border-gray-800/80 px-1 shrink-0">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2.5 px-6 py-3 text-sm font-medium transition-all duration-150 relative ${
              isActive
                ? 'text-emerald-400 bg-emerald-400/5 border-b-2 border-emerald-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02] border-b-2 border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.key === 'orders' && orderCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {orderCount}
              </span>
            )}
            <span className="text-[10px] text-gray-600 font-mono ml-1 hidden lg:inline">
              {tab.shortcut}
            </span>
          </button>
        )
      })}
    </div>
  )
}
