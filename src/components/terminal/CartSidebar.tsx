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
    <aside className="w-[420px] shrink-0 flex flex-col bg-gray-900 border-l border-gray-800 relative">
      {/* Modals & Panels */}
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

      {/* ── A. Cart Header ── */}
      <div className="shrink-0 h-12 border-b border-gray-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-300">Current Sale</span>
          {items.length > 0 && (
            <span className="bg-emerald-500/15 text-emerald-400 text-xs font-mono px-1.5 py-0.5 rounded">
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {heldCarts.length > 0 && (
            <button
              onClick={() => setShowHeldCarts(true)}
              className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg hover:bg-amber-400/20 transition-colors"
            >
              Held {heldCarts.length}
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-gray-600 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── B. Customer Section ── */}
      <div className="shrink-0 border-b border-gray-800">
        {customerId ? (
          <div className="px-4 py-2.5">
            <CustomerBadge onViewProfile={() => setShowProfile(true)} />
          </div>
        ) : (
          <div className="px-4 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <span className="text-sm text-gray-500 flex-1">Walk-in Customer</span>
            <button
              onClick={() => setShowSearch(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Assign
            </button>
          </div>
        )}
      </div>

      {/* ── C. Cart Items ── */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            <span className="text-sm text-gray-600">Cart is empty</span>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <div key={item.id} className="px-4 py-3 border-b border-gray-800/60 relative">
                {/* Row 1: Name + Remove */}
                <div className="flex items-start justify-between gap-6 mb-1.5">
                  <p className="text-sm text-gray-200 truncate flex-1">{item.productName}</p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* Row 2: Qty controls + Line total */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600 flex items-center justify-center text-xs transition-colors"
                    >
                      &#8722;
                    </button>
                    <span className="text-sm font-mono text-gray-100 w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600 flex items-center justify-center text-xs transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    {item.discountAmount > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 line-through tabular-nums font-mono">
                          {fmt(item.unitPrice * item.quantity)}
                        </span>
                        <span className="text-sm font-semibold text-emerald-400 tabular-nums font-mono">
                          {fmt((item.unitPrice - item.discountAmount) * item.quantity)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-gray-100 tabular-nums font-mono">
                        {fmt(item.unitPrice * item.quantity)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── D. Applied Discounts ── */}
      {discountResult && discountResult.applied_discounts.length > 0 && (
        <div className="shrink-0">
          {discountResult.applied_discounts.map((d) => (
            <div key={d.discount_id} className="px-4 py-1.5 flex justify-between text-xs">
              <span className="text-emerald-400 truncate flex items-center gap-1.5">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                {d.discount_name}
              </span>
              <span className="text-emerald-400 font-mono shrink-0">-{fmt(d.total_savings)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── E. Purchase Limit Gauge ── */}
      <div className="shrink-0 px-4 py-2">
        <PurchaseLimitGauge limit={purchaseLimit} />
      </div>

      {/* ── F. Totals ── */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-800">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-gray-500">Subtotal</span>
          <span className="text-sm text-gray-200 tabular-nums font-mono">{fmt(subtotal)}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between mb-1">
            <span className="text-xs text-emerald-400">Discounts</span>
            <span className="text-sm text-emerald-400 tabular-nums font-mono">-{fmt(discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between mb-1">
          <span className="text-xs text-gray-500">Tax</span>
          <span className="text-sm text-gray-200 tabular-nums font-mono">{fmt(taxTotal)}</span>
        </div>
        <div className="border-t border-gray-700 pt-2 mt-1 flex justify-between">
          <span className="text-base font-bold text-gray-50">TOTAL</span>
          <span className="text-base font-bold text-gray-50 tabular-nums font-mono">{fmt(total)}</span>
        </div>
      </div>

      {/* ── G. Action Buttons ── */}
      <div className="shrink-0 px-4 py-3 flex gap-2.5">
        <button
          disabled={items.length === 0}
          onClick={handleVoidClick}
          className="flex-1 h-12 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed bg-gray-800 border border-gray-700 text-gray-400 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400"
        >
          VOID
        </button>
        <button
          disabled={items.length === 0 || heldCarts.length >= 10}
          onClick={handleHoldClick}
          className="flex-1 h-12 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
        >
          HOLD
        </button>
        {drawer ? (
          <button
            disabled={!canPay}
            onClick={() => setShowCheckout(true)}
            className="flex-1 h-12 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30"
          >
            PAY
          </button>
        ) : (
          <button
            onClick={() => setShowOpenDrawer(true)}
            className="flex-1 h-12 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97] bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30"
          >
            Open Drawer
          </button>
        )}
      </div>
    </aside>
  )
}
