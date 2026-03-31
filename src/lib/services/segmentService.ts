import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

interface SegmentCondition {
  field: string
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains'
  value: unknown
}

interface SegmentRules {
  operator: 'AND' | 'OR'
  conditions: SegmentCondition[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CustomerData { lifetime_spend: number; visit_count: number; last_visit_at: string | null; is_medical: boolean; created_at: string; customer_group_ids: string[]; avg_transaction_value: number; [key: string]: any }

function evaluateCondition(cond: SegmentCondition, data: CustomerData): boolean {
  let fieldValue: unknown

  switch (cond.field) {
    case 'lifetime_spend': fieldValue = data.lifetime_spend; break
    case 'total_visits': fieldValue = data.visit_count; break
    case 'last_visit_days_ago':
      fieldValue = data.last_visit_at ? Math.floor((Date.now() - new Date(data.last_visit_at).getTime()) / 86400000) : 99999
      break
    case 'customer_type': fieldValue = data.is_medical ? 'medical' : 'recreational'; break
    case 'created_days_ago': fieldValue = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000); break
    case 'customer_group_ids': fieldValue = data.customer_group_ids; break
    case 'avg_transaction_value': fieldValue = data.avg_transaction_value; break
    default: return false
  }

  switch (cond.op) {
    case 'eq': return fieldValue === cond.value
    case 'neq': return fieldValue !== cond.value
    case 'gt': return Number(fieldValue) > Number(cond.value)
    case 'gte': return Number(fieldValue) >= Number(cond.value)
    case 'lt': return Number(fieldValue) < Number(cond.value)
    case 'lte': return Number(fieldValue) <= Number(cond.value)
    case 'contains': return Array.isArray(fieldValue) && fieldValue.includes(cond.value)
    case 'not_contains': return Array.isArray(fieldValue) && !fieldValue.includes(cond.value)
    default: return false
  }
}

export function evaluateRules(rules: SegmentRules, data: CustomerData): boolean {
  if (!rules.conditions || rules.conditions.length === 0) return false
  if (rules.operator === 'OR') return rules.conditions.some((c) => evaluateCondition(c, data))
  return rules.conditions.every((c) => evaluateCondition(c, data))
}

export async function evaluateSegmentMembership(customerId: string, segments: Array<{ id: string; rules: unknown }>): Promise<string[]> {
  const sb = await createSupabaseServerClient()

  const { data: customer } = await sb.from('customers').select('lifetime_spend, visit_count, last_visit_at, is_medical, created_at').eq('id', customerId).single()
  if (!customer) return []

  const { data: groups } = await sb.from('customer_group_members').select('customer_group_id').eq('customer_id', customerId)
  const groupIds = (groups ?? []).map((g) => g.customer_group_id)

  // Compute avg transaction value
  const { data: txns } = await sb.from('transactions').select('total').eq('customer_id', customerId).eq('status', 'completed').order('created_at', { ascending: false }).limit(20)
  const avgTx = txns && txns.length > 0 ? txns.reduce((s, t) => s + t.total, 0) / txns.length : 0

  const data: CustomerData = { ...customer, customer_group_ids: groupIds, avg_transaction_value: Math.round(avgTx * 100) / 100 }

  return segments.filter((seg) => evaluateRules(seg.rules as SegmentRules, data)).map((seg) => seg.id)
}

export async function listSegments(orgId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('segments').select('*').eq('organization_id', orgId).eq('is_active', true).order('name')
  return data ?? []
}

export async function createSegment(input: { organization_id: string; name: string; description?: string; rules: unknown }) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('segments') as any).insert({ organization_id: input.organization_id, name: input.name, description: input.description ?? null, rules: input.rules }).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateSegment(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('segments') as any).update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}

export async function previewSegment(rules: SegmentRules, orgId: string) {
  const sb = await createSupabaseServerClient()
  const { data: customers } = await sb.from('customers').select('id, first_name, last_name, lifetime_spend, visit_count, last_visit_at, is_medical, created_at').eq('organization_id', orgId).eq('status', 'active').limit(500)

  let count = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sample: any[] = []

  for (const c of customers ?? []) {
    const data: CustomerData = { ...c, customer_group_ids: [], avg_transaction_value: 0 }
    if (evaluateRules(rules, data)) {
      count++
      if (sample.length < 10) sample.push({ id: c.id, name: `${c.first_name} ${c.last_name}`, lifetime_spend: c.lifetime_spend })
    }
  }

  return { count, sample }
}
