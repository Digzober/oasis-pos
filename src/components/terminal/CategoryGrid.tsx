'use client'

import { useState, useEffect } from 'react'

interface Category {
  id: string
  name: string
  slug: string
  master_category: string | null
  sort_order: number
}

const CATEGORY_COLORS: Record<string, string> = {
  Flower: 'bg-success',
  'Pre-Rolls': 'bg-lime-700',
  Cartridges: 'bg-sky-700',
  Disposables: 'bg-cyan-700',
  Concentrates: 'bg-info',
  Edibles: 'bg-orange-700',
  Topicals: 'bg-pink-700',
  Kief: 'bg-yellow-700',
  'Moon Rocks': 'bg-indigo-700',
  Oral: 'bg-rose-700',
  Accessories: 'bg-raised',
  Glass: 'bg-raised',
  'Wraps/Papers': 'bg-raised',
  Beverages: 'bg-warning',
}

function getCategoryColor(masterCategory: string | null): string {
  if (!masterCategory) return 'bg-raised'
  return CATEGORY_COLORS[masterCategory] ?? 'bg-raised'
}

interface CategoryGridProps {
  onSelect: (category: Category) => void
}

export default function CategoryGrid({ onSelect }: CategoryGridProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-surface animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat)}
          className={`${getCategoryColor(cat.master_category)} h-20 rounded-xl flex items-center justify-center px-2 text-center transition-all hover:brightness-110 active:scale-[0.97]`}
        >
          <span className="text-primary text-xs font-medium leading-tight line-clamp-2">
            {cat.name}
          </span>
        </button>
      ))}
    </div>
  )
}
