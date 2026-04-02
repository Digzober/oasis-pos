'use client'

import { useState, useEffect, useCallback } from 'react'
import TerminalLayout from '@/components/terminal/TerminalLayout'
import ProductSearch from '@/components/terminal/ProductSearch'
import CategoryGrid from '@/components/terminal/CategoryGrid'
import TerminalTabBar, { type TerminalTab } from '@/components/terminal/TerminalTabBar'
import ReturnPanel from '@/components/terminal/ReturnPanel'
import OrderQueue from '@/components/terminal/OrderQueue'
import CustomerSearchPanel from '@/components/terminal/CustomerSearchPanel'
import QuickCustomerForm from '@/components/terminal/QuickCustomerForm'
import { useCart, type CartItemInput } from '@/hooks/useCart'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { useSession } from '@/hooks/useSession'

function makeCartInput(p: {
  id: string; name: string; sku?: string | null; rec_price: number;
  is_cannabis: boolean; weight_grams?: number | null; flower_equivalent?: number | null;
  brand_name?: string | null; category_name?: string | null; strain_name?: string | null;
}, invId: string | null = null, barcode: string | null = null): CartItemInput {
  return {
    productId: p.id, inventoryItemId: invId, productName: p.name,
    categoryId: '', categoryName: p.category_name ?? null,
    brandId: null, brandName: p.brand_name ?? null,
    vendorId: null, strainId: null, strainName: p.strain_name ?? null,
    sku: p.sku ?? null, quantity: 1, unitPrice: p.rec_price,
    isCannabis: p.is_cannabis, isMedical: false,
    weightGrams: p.weight_grams ?? null, flowerEquivalent: p.flower_equivalent ?? null,
    thcMg: null, biotrackBarcode: barcode, purchaseLimitCategory: null,
    productTagIds: [], inventoryTagIds: [], pricingTierId: null, weightDescriptor: null,
  }
}

export default function CheckoutPage() {
  const [activeTab, setActiveTab] = useState<TerminalTab>('sale')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null)
  const addItem = useCart((s) => s.addItem)
  const initializeCart = useCart((s) => s.initializeCart)
  const configLoaded = useCart((s) => s.configLoaded)
  const { session } = useSession()

  useEffect(() => {
    if (session && !configLoaded) {
      initializeCart({ locationId: session.locationId, organizationId: session.organizationId, employeeId: session.employeeId, registerId: session.registerId ?? '' })
    }
  }, [session, configLoaded, initializeCart])

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    if (!session) return
    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(barcode)}?location_id=${session.locationId}`)
      if (res.ok) { const data = await res.json(); addItem(makeCartInput(data.product, data.inventory_item.id, data.inventory_item.biotrack_barcode)) }
    } catch { /* toast handles */ }
  }, [session, addItem])

  useBarcodeScanner({ onScan: handleBarcodeScan, enabled: !!session })

  return (
    <TerminalLayout>
      <div className="flex flex-col h-full">
        <TerminalTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'sale' && (
            <div className="flex flex-col gap-4 h-full">
              <ProductSearch locationId={session?.locationId}
                categoryId={selectedCategory?.id}
                onSelect={(product) => addItem(makeCartInput(product))}
                onBarcodeScan={(result) => addItem(makeCartInput(result.product, result.inventory_item.id, result.inventory_item.biotrack_barcode))} />
              {selectedCategory && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/50 border border-emerald-700 rounded-full text-sm text-emerald-300">
                    {selectedCategory.name}
                    <button onClick={() => setSelectedCategory(null)} className="hover:text-white">&#10005;</button>
                  </div>
                </div>
              )}
              <CategoryGrid onSelect={(category) => setSelectedCategory({ id: category.id, name: category.name })} />
            </div>
          )}

          {activeTab === 'returns' && <ReturnPanel onClose={() => setActiveTab('sale')} />}

          {activeTab === 'orders' && session && <OrderQueue locationId={session.locationId} />}

          {activeTab === 'customers' && (
            <>
              <CustomerSearchPanel onClose={() => setActiveTab('sale')} onNewCustomer={() => setShowNewCustomer(true)} />
              {showNewCustomer && <QuickCustomerForm onClose={() => setShowNewCustomer(false)} />}
            </>
          )}
        </div>
      </div>
    </TerminalLayout>
  )
}
