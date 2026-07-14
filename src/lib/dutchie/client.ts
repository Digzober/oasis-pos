import { logger } from '@/lib/utils/logger'
import type {
  DutchieEmployee, DutchieCustomer, DutchieProduct, DutchieInventoryItem,
  DutchieRoom, DutchieBrand, DutchieStrain, DutchieVendor, DutchieCategory,
  DutchieTag, DutchiePricingTier, DutchieTerminal, DutchieDiscount,
  DutchieTransaction,
} from './types'
import type { DutchieLoyaltySnapshot } from './types'
import { incrementalSince } from './syncPolicy'

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
    logger.warn('Dutchie unwrap: unexpected response shape', {
      type: typeof data,
      keys: typeof data === 'object' && data !== null ? Object.keys(data).slice(0, 10) : [],
    })
    return []
  }

  /**
   * Auto-paginates offset/limit endpoints (products, inventory).
   */
  private async fetchAllOffset<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    pageSize = 100,
    deadline?: number,
  ): Promise<T[]> {
    const all: T[] = []
    let offset = 0

    while (true) {
      if (deadline && Date.now() >= deadline) throw new Error('Dutchie sync deadline reached')
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
    deadline?: number,
  ): Promise<T[]> {
    const all: T[] = []
    let page = 1

    while (true) {
      if (deadline && Date.now() >= deadline) throw new Error('Dutchie sync deadline reached')
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
    const items = this.unwrap<DutchieEmployee>(data)
    logger.info('Dutchie employees fetched', { total: items.length })
    return items
  }

  async fetchCustomers(since?: Date, deadline?: number): Promise<DutchieCustomer[]> {
    const params: Record<string, string> = {}
    if (since) {
      params.fromLastModifiedDateUTC = incrementalSince(since).toISOString()
    }
    // Customers endpoint always paginates — must use PageNumber/PageSize
    return this.fetchAllPaged<DutchieCustomer>('/customer/customers-paginated', params, 1000, deadline)
  }

  async fetchProducts(since?: Date, deadline?: number): Promise<DutchieProduct[]> {
    const params: Record<string, string> = {}
    if (since) {
      params.fromLastModifiedDateUTC = incrementalSince(since).toISOString()
    }
    if (deadline && Date.now() >= deadline) throw new Error('Dutchie sync deadline reached')
    // Try single request first (the-vault pattern) — Dutchie may return all products at once
    const data = await this.get<unknown>('/products', params)
    const items = this.unwrap<DutchieProduct>(data)
    if (items.length > 0) {
      logger.info('Dutchie products fetched', { total: items.length, mode: 'single' })
      return items
    }
    // Fall back to pagination if single request returned empty
    return this.fetchAllOffset<DutchieProduct>('/products', params, 500, deadline)
  }

  async fetchInventory(opts?: { includeLabResults?: boolean; includeRoomQuantities?: boolean; deadline?: number }): Promise<DutchieInventoryItem[]> {
    const params: Record<string, string | boolean> = {}
    if (opts?.includeLabResults) params.includeLabResults = true
    if (opts?.includeRoomQuantities) params.includeRoomQuantities = true
    // Dutchie /reporting/inventory uses Skip/Take pagination (PascalCase), page size 5000
    const all: DutchieInventoryItem[] = []
    let skip = 0
    const pageSize = 5000

    while (true) {
      if (opts?.deadline && Date.now() >= opts.deadline) throw new Error('Dutchie sync deadline reached')
      const data = await this.get<unknown>('/reporting/inventory', { ...params, Skip: skip, Take: pageSize })
      const items = this.unwrap<DutchieInventoryItem>(data)
      if (items.length === 0) break
      for (const item of items) all.push(item)
      if (items.length < pageSize) break
      skip += pageSize
    }

    logger.info('Dutchie inventory fetch complete', { total: all.length })
    return all
  }

  async fetchTransactions(opts: { startDate: string; endDate: string; endExclusive?: boolean }): Promise<DutchieTransaction[]> {
    // /reporting/transactions uses FromDateUTC/ToDateUTC (ISO 8601 datetime)
    const fromDate = opts.startDate.includes('T') ? opts.startDate : `${opts.startDate.slice(0, 10)}T00:00:00Z`
    const rawToDate = opts.endDate.includes('T') ? opts.endDate : `${opts.endDate.slice(0, 10)}T23:59:59Z`
    const toDate = opts.endExclusive
      ? new Date(new Date(rawToDate).getTime() - 1).toISOString()
      : rawToDate

    // /reporting/transactions with FromDateUTC/ToDateUTC in YYYY-MM-DD format
    const data = await this.get<unknown>('/reporting/transactions', {
      FromDateUTC: fromDate.slice(0, 10),
      ToDateUTC: toDate.slice(0, 10),
      IncludeDetail: 'true',
      IncludeTaxes: 'true',
    })
    const items = this.unwrap<DutchieTransaction>(data)
    logger.info('Dutchie transactions fetch complete', { total: items.length })
    return items
  }

  /**
   * The snapshot endpoint is limited to one request per minute. It deliberately
   * bypasses the retrying GET wrapper so one sync run can issue exactly one HTTP
   * attempt, including for 429 and timeout responses.
   */
  async getLoyaltySnapshot(): Promise<DutchieLoyaltySnapshot[]> {
    const path = '/reporting/loyalty-snapshot'
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: { Authorization: this.authHeader, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      throw new Error(`Dutchie loyalty snapshot failed with status ${res.status}`)
    }
    const data: unknown = await res.json()
    const items = this.unwrap<DutchieLoyaltySnapshot>(data)
    logger.info('Dutchie loyalty snapshot fetched', { total: items.length })
    return items
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
