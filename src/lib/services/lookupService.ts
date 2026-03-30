import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

type LookupTable = 'brands' | 'vendors' | 'strains' | 'tags'

export async function listLookup(table: LookupTable, orgId: string, extraFilters?: Record<string, unknown>) {
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
