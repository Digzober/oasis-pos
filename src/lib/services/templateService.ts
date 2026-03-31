import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

export async function listTemplates(orgId: string, type?: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('campaign_templates') as any).select('*').eq('organization_id', orgId).eq('is_active', true)
  if (type) query = query.eq('type', type)
  const { data } = await query.order('name')
  return data ?? []
}

export async function createTemplate(input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('campaign_templates') as any).insert(input).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateTemplate(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('campaign_templates') as any).update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}

export async function previewTemplate(templateId: string, customerId: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template } = await (sb.from('campaign_templates') as any).select('*').eq('id', templateId).single()
  if (!template) throw new AppError('NOT_FOUND', 'Template not found', undefined, 404)

  const { data: customer } = await sb.from('customers').select('first_name, last_name, lifetime_spend, last_visit_at').eq('id', customerId).single()
  const { data: loyalty } = await sb.from('loyalty_balances').select('current_points').eq('customer_id', customerId).maybeSingle()

  const vars: Record<string, string> = {
    first_name: customer?.first_name ?? '',
    last_name: customer?.last_name ?? '',
    loyalty_points: String(loyalty?.current_points ?? 0),
    lifetime_spend: customer?.lifetime_spend ? `$${Number(customer.lifetime_spend).toFixed(2)}` : '$0.00',
    last_visit_date: customer?.last_visit_at ? new Date(customer.last_visit_at).toLocaleDateString() : 'Never',
  }

  return {
    subject: mergeVars(template.name ?? '', vars),
    body: mergeVars(template.html_content ?? '', vars),
  }
}

export function mergeVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}
