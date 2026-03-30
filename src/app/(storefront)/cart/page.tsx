'use client'

import Link from 'next/link'
import { useOnlineCart } from '@/stores/onlineCartStore'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

export default function CartPage() {
  const { items, subtotal, estimatedTax, estimatedTotal, removeItem, updateQuantity } = useOnlineCart()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Link href="/menu" className="text-emerald-600 hover:text-emerald-500 font-medium">Browse Menu</Link>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={item.product_id} className="flex items-center gap-4 border-b pb-4">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">{fmt(item.price)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="w-8 h-8 border rounded flex items-center justify-center">−</button>
                  <span className="w-8 text-center tabular-nums">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="w-8 h-8 border rounded flex items-center justify-center">+</button>
                </div>
                <p className="w-20 text-right font-medium tabular-nums">{fmt(item.price * item.quantity)}</p>
                <button onClick={() => removeItem(item.product_id)} className="text-red-500 text-sm">Remove</button>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span className="tabular-nums">{fmt(subtotal)}</span></div>
            <div className="flex justify-between text-sm text-gray-500"><span>Estimated Tax</span><span className="tabular-nums">{fmt(estimatedTax)}</span></div>
            <div className="flex justify-between text-lg font-bold"><span>Estimated Total</span><span className="tabular-nums">{fmt(estimatedTotal)}</span></div>
          </div>

          <Link href="/order/checkout" className="block w-full mt-6 py-3 bg-emerald-600 text-white text-center rounded-lg font-medium hover:bg-emerald-500 transition-colors">
            Continue to Checkout
          </Link>
        </>
      )}
    </div>
  )
}
