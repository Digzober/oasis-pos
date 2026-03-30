'use client'

import TerminalLayout from '@/components/terminal/TerminalLayout'
import ProductSearch from '@/components/terminal/ProductSearch'
import CategoryGrid from '@/components/terminal/CategoryGrid'
import { useCart } from '@/hooks/useCart'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { useSession } from '@/hooks/useSession'
import { useCallback } from 'react'

export default function CheckoutPage() {
  const addItem = useCart((s) => s.addItem)
  const { session } = useSession()

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      if (!session) return
      try {
        const res = await fetch(
          `/api/products/barcode/${encodeURIComponent(barcode)}?location_id=${session.locationId}`,
        )
        if (res.ok) {
          const data = await res.json()
          addItem({
            productId: data.product.id,
            inventoryItemId: data.inventory_item.id,
            productName: data.product.name,
            categoryName: data.product.category_name,
            brandName: data.product.brand_name,
            sku: data.product.sku,
            quantity: 1,
            unitPrice: data.product.rec_price,
            isCannabis: data.product.is_cannabis,
            isMedical: false,
            weightGrams: data.product.weight_grams,
            flowerEquivalent: data.product.flower_equivalent,
            biotrackBarcode: data.inventory_item.biotrack_barcode,
          })
        }
      } catch {
        // handled by ProductSearch toast
      }
    },
    [session, addItem],
  )

  // Background barcode listener (when no input focused)
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: !!session,
  })

  return (
    <TerminalLayout>
      <div className="flex flex-col gap-4 h-full">
        <ProductSearch
          locationId={session?.locationId}
          onSelect={(product) => {
            addItem({
              productId: product.id,
              inventoryItemId: null,
              productName: product.name,
              categoryName: product.category_name,
              brandName: product.brand_name,
              sku: product.sku,
              quantity: 1,
              unitPrice: product.rec_price,
              isCannabis: product.is_cannabis,
              isMedical: false,
              weightGrams: product.weight_grams,
              flowerEquivalent: null,
              biotrackBarcode: null,
            })
          }}
          onBarcodeScan={(result) => {
            addItem({
              productId: result.product.id,
              inventoryItemId: result.inventory_item.id,
              productName: result.product.name,
              categoryName: result.product.category_name,
              brandName: result.product.brand_name,
              sku: result.product.sku,
              quantity: 1,
              unitPrice: result.product.rec_price,
              isCannabis: result.product.is_cannabis,
              isMedical: false,
              weightGrams: result.product.weight_grams,
              flowerEquivalent: result.product.flower_equivalent,
              biotrackBarcode: result.inventory_item.biotrack_barcode,
            })
          }}
        />
        <CategoryGrid
          onSelect={(category) => {
            console.log('Category selected:', category.name, category.id)
          }}
        />
      </div>
    </TerminalLayout>
  )
}
