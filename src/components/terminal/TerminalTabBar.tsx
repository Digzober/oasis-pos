'use client'

import { useEffect, useState } from 'react'

export type TerminalTab = 'sale' | 'returns' | 'orders' | 'customers'

interface Props {
  activeTab: TerminalTab
  onTabChange: (tab: TerminalTab) => void
  orderCount?: number
}

const TABS: Array<{ key: TerminalTab; label: string; icon: string; shortcut: string }> = [
  { key: 'sale', label: 'Sale', icon: '🛒', shortcut: 'F1' },
  { key: 'returns', label: 'Returns', icon: '↩', shortcut: 'F2' },
  { key: 'orders', label: 'Orders', icon: '📋', shortcut: 'F3' },
  { key: 'customers', label: 'Customers', icon: '👤', shortcut: 'F4' },
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
    <div className="flex items-center gap-1 bg-gray-800 border-b border-gray-700 px-2">
      {TABS.map((tab) => (
        <button key={tab.key} onClick={() => onTabChange(tab.key)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors relative ${
            activeTab === tab.key ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-gray-200'
          }`}>
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
          {tab.key === 'orders' && orderCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{orderCount}</span>
          )}
          <span className="text-[10px] text-gray-600 ml-1 hidden lg:inline">{tab.shortcut}</span>
        </button>
      ))}
    </div>
  )
}
