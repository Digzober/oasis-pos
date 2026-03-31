const CACHE_KEY = 'oasis-offline-cache'

interface CacheData {
  products: unknown[]
  taxRates: unknown[]
  discounts: unknown[]
  purchaseLimits: unknown[]
  employees: unknown[]
  cachedAt: string
}

function getCache(): CacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function setCache(data: Partial<CacheData>) {
  const existing = getCache() ?? { products: [], taxRates: [], discounts: [], purchaseLimits: [], employees: [], cachedAt: '' }
  const merged = { ...existing, ...data, cachedAt: new Date().toISOString() }
  localStorage.setItem(CACHE_KEY, JSON.stringify(merged))
}

export async function cacheProductCatalog(locationId: string) {
  const res = await fetch(`/api/products?limit=100&isActive=true`)
  if (res.ok) { const d = await res.json(); setCache({ products: d.products ?? [] }) }
}

export function getCachedProducts() { return getCache()?.products ?? [] }

export async function cacheTaxRates(locationId: string) {
  const res = await fetch(`/api/cart/config?location_id=${locationId}`)
  if (res.ok) { const d = await res.json(); setCache({ taxRates: d.taxRates ?? [], discounts: d.discounts ?? [], purchaseLimits: d.purchaseLimits ?? [] }) }
}

export function getCachedTaxRates() { return getCache()?.taxRates ?? [] }
export function getCachedDiscounts() { return getCache()?.discounts ?? [] }
export function getCachedPurchaseLimits() { return getCache()?.purchaseLimits ?? [] }

export async function cacheEmployees() {
  const res = await fetch('/api/employees?status=active')
  if (res.ok) { const d = await res.json(); setCache({ employees: d.employees ?? [] }) }
}

export function getCachedEmployees() { return getCache()?.employees ?? [] }

export function getLastCacheTime(): Date | null {
  const cached = getCache()
  return cached?.cachedAt ? new Date(cached.cachedAt) : null
}

export async function refreshAllCaches(locationId: string) {
  await Promise.allSettled([cacheProductCatalog(locationId), cacheTaxRates(locationId), cacheEmployees()])
}
