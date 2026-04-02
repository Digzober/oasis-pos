import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

type LookupTable = 'brands' | 'vendors' | 'strains' | 'tags' | 'producers'

export interface ListLookupOptions {
  includeInactive?: boolean
  page?: number
  limit?: number
  extraFilters?: Record<string, unknown>
}

export interface PaginatedResult {
  data: Record<string, unknown>[]
  total: number
  page: number
  limit: number
}

export async function listLookup(table: LookupTable, orgId: string, extraFilters?: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from(table) as any).select('*').eq('is_active', true).order('name').eq('organization_id', orgId)
  if (table === 'tags' && extraFilters?.tag_type) {
    query = query.eq('tag_type', extraFilters.tag_type)
  }
  const { data, error } = await query
  if (error) throw new AppError('LIST_FAILED', `Failed to list ${table}`, error, 500)
  return data ?? []
}

export async function listLookupPaginated(table: LookupTable, orgId: string, opts: ListLookupOptions): Promise<PaginatedResult> {
  const sb = await createSupabaseServerClient()

  const page = opts.page ?? 1
  const limit = opts.limit ?? 100
  const includeInactive = opts.includeInactive ?? false
  const extraFilters = opts.extraFilters

  const from = (page - 1) * limit
  const to = from + limit - 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from(table) as any).select('*', { count: 'exact' }).eq('organization_id', orgId).order('name')

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  if (table === 'tags' && extraFilters?.tag_type) {
    query = query.eq('tag_type', extraFilters.tag_type)
  }

  if (table === 'strains' && extraFilters?.strain_type) {
    query = query.eq('strain_type', extraFilters.strain_type)
  }

  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw new AppError('LIST_FAILED', `Failed to list ${table}`, error, 500)

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
  }
}

export async function createLookup(table: LookupTable, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from(table) as any).insert(input).select().single()
  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      throw new AppError('DUPLICATE', `A ${table.slice(0, -1)} with this name already exists`, error, 409)
    }
    throw new AppError('CREATE_FAILED', `Failed to create ${table.slice(0, -1)}`, error, 500)
  }
  return data
}

export async function updateLookup(table: LookupTable, id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from(table) as any).update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', `Failed to update ${table.slice(0, -1)}`, error, 500)
  return data
}

export async function deactivateLookup(table: LookupTable, id: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (sb.from(table) as any).update({ is_active: false }).eq('id', id)
  if (error) throw new AppError('DEACTIVATE_FAILED', `Failed to deactivate`, error, 500)
}
