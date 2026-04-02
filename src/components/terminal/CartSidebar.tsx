'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { useSession } from '@/hooks/useSession'
import { useCashDrawer } from '@/hooks/useCashDrawer'
import CustomerBadge from './CustomerBadge'
import CustomerSearchPanel from './CustomerSearchPanel'
import QuickCustomerForm from './QuickCustomerForm'
import CustomerProfileDrawer from './CustomerProfileDrawer'
import PurchaseLimitGauge from './PurchaseLimitGauge'
import CheckoutPanel from './CheckoutPanel'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function CartSidebar() {
  const {
    items, customerId, customerName, subtotal, discountTotal, taxTotal, total,
    removeItem, updateQuantity, clearCart, purchaseLimit, discountResult,
    heldCarts, holdCart, resumeCart, deleteHeldCart,
  } = useCart()
  const { session } = useSession()
  const { drawer, openDrawer } = useCashDrawer(session?.registerId ?? '')
  const [showSearch, setShowSearch] = useState(false)
  const [showOpenDrawer, setShowOpenDrawer] = useState(false)
  const [drawerAmount, setDrawerAmount] = useState('200')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showHeldCarts, setShowHeldCarts] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const canPay = items.length > 0 && (purchaseLimit?.allowed ?? true) && !!drawer

  const handleVoidClick = () => {
    if (items.length === 0) return
    setShowClearConfirm(true)
  }

  const confirmClear = () => {
    clearCart()
    setShowClearConfirm(false)
  }

  const handleHoldClick = () => {
    if (items.length === 0) return
    if (heldCarts.length >= 10) return
    holdCart(session?.employeeName ?? 'Unknown')
    setToast('Sale held')
    setTimeout(() => setToast(null), 2000)
  }

  const handleResume = (id: string) => {
    if (items.length > 0) {
      // Hold current cart first
      holdCart(session?.employeeName ?? 'Unknown')
    }
    resumeCart(id)
    setShowHeldCarts(false)
  }

  const getHeldAge = (heldAt: string) => {
    const mins = Math.floor((Date.now() - new Date(heldAt).getTime()) / 60000)
    if (mins < 1) return '<1m'
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  return (
    <aside className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col shrink-0">
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
      {showCheckout && (
        <CheckoutPanel onClose={() => setShowCheckout(false)} cashDrawerId={drawer?.id ?? ''} />
      )}

      {/* Clear Confirm Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-50 mb-2">Clear this sale?</h3>
            <p className="text-sm text-gray-400 mb-6">All items will be removed from the cart.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={confirmClear} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500">Clear Sale</button>
            </div>
          </div>
        </div>
      )}

      {/* Held Carts Panel */}
      {showHeldCarts && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-50">Held Sales ({heldCarts.length})</h3>
              <button onClick={() => setShowHeldCarts(false)} className="text-gray-400 hover:text-gray-200">&#10005;</button>
            </div>
            {heldCarts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No held sales</p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {heldCarts.map((held) => {
                  const age = getHeldAge(held.heldAt)
                  const isOld = (Date.now() - new Date(held.heldAt).getTime()) > 120 * 60000
                  return (
                    <li key={held.id} className={`bg-gray-900 rounded-lg p-3 ${isOld ? 'border border-amber-600' : 'border border-gray-700'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-50">{held.customerName ?? 'Walk-in'}</span>
                        <span className={`text-xs ${isOld ? 'text-amber-400' : 'text-gray-500'}`}>{age} ago</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">{held.itemCount} items &middot; {held.heldBy}</span>
                        <span className="text-sm text-gray-50 font-medium tabular-nums">{fmt(held.total)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleResume(held.id)} className="flex-1 h-8 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-500">Resume</button>
                        <button onClick={() => deleteHeldCart(held.id)} className="h-8 px-3 bg-gray-700 text-gray-400 text-xs rounded-lg hover:text-red-400">Delete</button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Open Drawer Dialog */}
      {showOpenDrawer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-50 mb-2">Open Cash Drawer</h3>
            <p className="text-sm text-gray-400 mb-4">Enter the opening amount to start selling.</p>
            <label className="block mb-4">
              <span className="text-xs text-gray-400">Opening Amount ($)</span>
              <input
                type="number" step="0.01" value={drawerAmount}
                onChange={e => setDrawerAmount(e.target.value)}
                className="w-full h-12 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-lg text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowOpenDrawer(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
              <button
                onClick={async () => {
                  if (session) {
                    await openDrawer(parseFloat(drawerAmount) || 200, session.locationId, session.employeeId)
                  }
                  setShowOpenDrawer(false)
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500"
              >Open Drawer</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute top-4 right-4 bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
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
        <div className="flex items-center gap-2">
          {heldCarts.length > 0 && (
            <button onClick={() => setShowHeldCarts(true)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              Held
              <span className="bg-amber-600 text-white text-[10px] px-1 rounded-full">{heldCarts.length}</span>
            </button>
          )}
          {items.length > 0 && (
            <button onClick={clearCart} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Customer */}
      <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        {customerId ? (
          <CustomerBadge onViewProfile={() => setShowProfile(true)} />
        ) : (
          <>
            <span className="text-sm text-gray-300">{customerName}</span>
            <button onClick={() => setShowSearch(true)} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              + Customer
            </button>
          </>
        )}
      </div>

      {/* Purchase Limit */}
      <PurchaseLimitGauge limit={purchaseLimit} />

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
                    {fmt(item.unitPrice * item.quantity)}
                  </p>
                </div>
                {item.discountAmount > 0 && (
                  <p className="text-xs text-emerald-400 mt-0.5">
                    -{fmt(item.discountAmount * item.quantity)} discount
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center border border-gray-600 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-gray-700 rounded-l-lg transition-colors"
                    >&#8722;</button>
                    <span className="w-8 text-center text-sm text-gray-50 tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-gray-700 rounded-r-lg transition-colors"
                    >+</button>
                  </div>
                  <span className="text-xs text-gray-400 tabular-nums">@ {fmt(item.unitPrice)}</span>
                  <button onClick={() => removeItem(item.id)} className="ml-auto text-xs text-gray-500 hover:text-red-400 transition-colors">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Applied Discounts */}
      {discountResult && discountResult.applied_discounts.length > 0 && (
        <div className="border-t border-gray-700 px-4 py-2">
          {discountResult.applied_discounts.map((d) => (
            <div key={d.discount_id} className="flex justify-between text-xs py-0.5">
              <span className="text-emerald-400 truncate">{d.discount_name}</span>
              <span className="text-emerald-400 tabular-nums shrink-0">-{fmt(d.total_savings)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="border-t border-gray-700 px-4 py-3 space-y-1">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Subtotal</span>
          <span className="tabular-nums">{fmt(subtotal)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between text-sm text-emerald-400">
            <span>Discounts</span>
            <span className="tabular-nums">-{fmt(discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-400">
          <span>Tax</span>
          <span className="tabular-nums">{fmt(taxTotal)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-50 pt-1">
          <span>Total</span>
          <span className="tabular-nums">{fmt(total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-700 p-3 grid grid-cols-3 gap-2">
        <button
          disabled={items.length === 0}
          onClick={handleVoidClick}
          className="col-span-1 h-12 rounded-lg bg-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Void
        </button>
        <button
          disabled={items.length === 0 || heldCarts.length >= 10}
          onClick={handleHoldClick}
          className="col-span-1 h-12 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors relative"
        >
          Hold
          {heldCarts.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-400 text-gray-900 text-[10px] font-bold px-1 rounded-full">{heldCarts.length}</span>
          )}
        </button>
        {drawer ? (
          <button
            disabled={!canPay}
            onClick={() => setShowCheckout(true)}
            className="col-span-1 h-12 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Pay
          </button>
        ) : (
          <button
            onClick={() => setShowOpenDrawer(true)}
            className="col-span-1 h-12 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors"
          >
            Open Drawer
          </button>
        )}
      </div>
    </aside>
  )
}
