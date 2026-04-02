import { logger } from '@/lib/utils/logger'
import type {
  DutchieEmployee, DutchieCustomer, DutchieProduct, DutchieInventoryItem,
  DutchieRoom, DutchieBrand, DutchieStrain, DutchieVendor, DutchieCategory,
  DutchieTag, DutchiePricingTier, DutchieTerminal, DutchieDiscount,
} from './types'

const BASE_URL = 'https://api.pos.dutchie.com' // NO /v1 suffix
const MAX_RETRIES = 4
const REQUEST_TIMEOUT_MS = 30000

export class DutchieClient {
  private authHeader: string

  constructor(private apiKey: string) {
    this.authHeader = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
  }

  /**
   * Core GET with rate limit retry + AbortSignal timeout.
   * On 429: reads Retry-After header or uses exponential backoff 1s→2s→4s→8s.
   */
  private async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v))
      })
    }

    let lastError: Error | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const start = Date.now()
        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: { Authorization: this.authHeader, Accept: 'application/json' },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })

        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After')
          const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000
          logger.warn('Dutchie rate limited', { path, attempt, waitMs })
          await new Promise(r => setTimeout(r, waitMs))
          continue
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`Dutchie API ${res.status}: ${text || res.statusText}`)
        }

        const data = await res.json()
        logger.info('Dutchie request', { path, status: res.status, ms: Date.now() - start })
        return data as T
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < MAX_RETRIES && (lastError.name === 'AbortError' || lastError.message.includes('429'))) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
          continue
        }
        throw lastError
      }
    }
    throw lastError || new Error('Max retries exceeded')
  }

  /**
   * Unwraps responses that may be arrays or objects wrapping arrays.
   */
  private unwrap<T>(data: unknown): T[] {
    if (Array.isArray(data)) return data
    if (typeof data === 'object' && data !== null) {
      const vals = Object.values(data)
      const arr = vals.find(v => Array.isArray(v))
      if (arr) return arr as T[]
    }
    return []
  }

  /**
   * Auto-paginates offset/limit endpoints (products, inventory).
   */
  private async fetchAllOffset<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    pageSize = 100,
  ): Promise<T[]> {
    const all: T[] = []
    let offset = 0

    while (true) {
      const data = await this.get<unknown>(path, { ...params, offset, limit: pageSize })
      const items = this.unwrap<T>(data)
      if (items.length === 0) break
      for (const item of items) all.push(item)
      if (items.length < pageSize) break
      offset += items.length
    }

    logger.info('Dutchie paginated fetch complete', { path, total: all.length })
    return all
  }

  /**
   * Auto-paginates PageNumber/PageSize endpoints (customers-paginated).
   */
  private async fetchAllPaged<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    pageSize = 100,
  ): Promise<T[]> {
    const all: T[] = []
    let page = 1

    while (true) {
      const data = await this.get<unknown>(path, { ...params, PageNumber: page, PageSize: pageSize })
      const items = this.unwrap<T>(data)
      if (items.length === 0) break
      for (const item of items) all.push(item)
      if (items.length < pageSize) break
      page++
    }

    logger.info('Dutchie paged fetch complete', { path, total: all.length })
    return all
  }

  // ========== Auth ==========

  async whoami(): Promise<{ locationName: string; locationId: number; companyName: string; valid: boolean }> {
    try {
      const data = await this.get<Record<string, unknown>>('/whoami')
      return {
        locationName: (data.LocationName ?? data.locationName ?? '') as string,
        locationId: (data.LocationId ?? data.locationId ?? 0) as number,
        companyName: (data.CompanyName ?? data.companyName ?? data.organizationName ?? '') as string,
        valid: true,
      }
    } catch {
      return { locationName: '', locationId: 0, companyName: '', valid: false }
    }
  }

  // ========== Tier 1: Core entities ==========

  async fetchEmployees(): Promise<DutchieEmployee[]> {
    const data = await this.get<unknown>('/employees')
    return this.unwrap<DutchieEmployee>(data)
  }

  async fetchCustomers(since?: Date): Promise<DutchieCustomer[]> {
    const params: Record<string, string> = {}
    if (since) {
      // Subtract 60 seconds per Dutchie docs for incremental safety
      const buffered = new Date(since.getTime() - 60_000)
      params.fromLastModifiedDateUTC = buffered.toISOString()
    }
    // Use paginated endpoint for large datasets
    return this.fetchAllPaged<DutchieCustomer>('/customer/customers-paginated', params)
  }

  async fetchProducts(since?: Date): Promise<DutchieProduct[]> {
    const params: Record<string, string> = {}
    if (since) {
      const buffered = new Date(since.getTime() - 60_000)
      params.fromLastModifiedDateUTC = buffered.toISOString()
    }
    return this.fetchAllOffset<DutchieProduct>('/products', params)
  }

  async fetchInventory(opts?: { includeLabResults?: boolean; includeRoomQuantities?: boolean }): Promise<DutchieInventoryItem[]> {
    const params: Record<string, string | boolean> = {}
    if (opts?.includeLabResults) params.includeLabResults = true
    if (opts?.includeRoomQuantities) params.includeRoomQuantities = true
    return this.fetchAllOffset<DutchieInventoryItem>('/inventory', params)
  }

  async fetchRooms(): Promise<DutchieRoom[]> {
    const data = await this.get<unknown>('/room/rooms')
    return this.unwrap<DutchieRoom>(data)
  }

  // ========== Tier 2: Reference data ==========

  async fetchBrands(): Promise<DutchieBrand[]> {
    const data = await this.get<unknown>('/brand')
    return this.unwrap<DutchieBrand>(data)
  }

  async fetchStrains(): Promise<DutchieStrain[]> {
    const data = await this.get<unknown>('/strains')
    return this.unwrap<DutchieStrain>(data)
  }

  async fetchVendors(): Promise<DutchieVendor[]> {
    const data = await this.get<unknown>('/vendor/vendors')
    return this.unwrap<DutchieVendor>(data)
  }

  async fetchCategories(): Promise<DutchieCategory[]> {
    const data = await this.get<unknown>('/product-category')
    return this.unwrap<DutchieCategory>(data)
  }

  async fetchTags(): Promise<DutchieTag[]> {
    const data = await this.get<unknown>('/tag')
    return this.unwrap<DutchieTag>(data)
  }

  async fetchPricingTiers(): Promise<DutchiePricingTier[]> {
    const data = await this.get<unknown>('/pricing-tiers')
    return this.unwrap<DutchiePricingTier>(data)
  }

  async fetchTerminals(): Promise<DutchieTerminal[]> {
    const data = await this.get<unknown>('/terminals')
    return this.unwrap<DutchieTerminal>(data)
  }

  async fetchDiscounts(): Promise<DutchieDiscount[]> {
    const data = await this.get<unknown>('/discounts/v2/list')
    return this.unwrap<DutchieDiscount>(data)
  }
}
