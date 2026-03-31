'use client'
import { use } from 'react'
import DiscountBuilder from '@/components/backoffice/DiscountBuilder'
export default function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <DiscountBuilder discountId={id} />
}
