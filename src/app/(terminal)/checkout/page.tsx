'use client'

import TerminalLayout from '@/components/terminal/TerminalLayout'
import ProductSearch from '@/components/terminal/ProductSearch'
import CategoryGrid from '@/components/terminal/CategoryGrid'
import { useCart } from '@/hooks/useCart'

export default function CheckoutPage() {
  const addItem = useCart((s) => s.addItem)

  return (
    <TerminalLayout>
      <div className="flex flex-col gap-4 h-full">
        <ProductSearch
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
