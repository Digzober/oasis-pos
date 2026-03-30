'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import CustomerBadge from './CustomerBadge'
import CustomerSearchPanel from './CustomerSearchPanel'
import QuickCustomerForm from './QuickCustomerForm'
import CustomerProfileDrawer from './CustomerProfileDrawer'

function formatMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function CartSidebar() {
  const { items, customerId, customerName, subtotal, taxTotal, total, removeItem, updateQuantity, clearCart } =
    useCart()
  const [showSearch, setShowSearch] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  return (
    <aside className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0">
      {/* Customer search/form modals */}
      {showSearch && (
        <CustomerSearchPanel
          onClose={() => setShowSearch(false)}
          onNewCustomer={() => { setShowSearch(false); setShowNewCustomer(true) }}
        />
      )}
      {showNewCustomer && <QuickCustomerForm onClose={() => setShowNewCustomer(false)} />}
      {showProfile && customerId && (
        <CustomerProfileDrawer customerId={customerId} onClose={() => setShowProfile(false)} />
      )}

      {/* Header */}
      <div className="h-12 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-gray-50 font-semibold text-sm">Current Sale</h2>
          {items.length > 0 && (
            <span className="bg-emerald-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Customer */}
      <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        {customerId ? (
          <CustomerBadge onViewProfile={() => setShowProfile(true)} />
        ) : (
          <>
            <span className="text-sm text-gray-300">{customerName}</span>
            <button
              onClick={() => setShowSearch(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              + Customer
            </button>
          </>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm px-4 text-center">
            Scan or search to add items
          </div>
        ) : (
          <ul className="divide-y divide-gray-700">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-50 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[item.brandName, item.categoryName].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <p className="text-sm text-gray-50 font-medium tabular-nums shrink-0">
                    {formatMoney(item.lineTotal)}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center border border-gray-600 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-gray-700 rounded-l-lg transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm text-gray-50 tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-gray-700 rounded-r-lg transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-gray-400 tabular-nums">
                    @ {formatMoney(item.unitPrice)}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-auto text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-gray-700 px-4 py-3 space-y-1">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatMoney(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-400">
          <span>Tax</span>
          <span className="tabular-nums">{formatMoney(taxTotal)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-50 pt-1">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-700 p-3 grid grid-cols-3 gap-2">
        <button
          disabled
          className="col-span-1 h-12 rounded-lg bg-gray-700 text-gray-400 text-sm font-medium transition-colors hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Void
        </button>
        <button
          disabled={items.length === 0}
          className="col-span-1 h-12 rounded-lg bg-amber-600 text-white text-sm font-medium transition-colors hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Hold
        </button>
        <button
          disabled={items.length === 0}
          className="col-span-1 h-12 rounded-lg bg-emerald-600 text-white text-sm font-bold transition-colors hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Pay
        </button>
      </div>
    </aside>
  )
}
