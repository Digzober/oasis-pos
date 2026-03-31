import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export async function listCampaigns(orgId: string, filters?: { status?: string; type?: string; page?: number }) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('campaigns') as any).select('*, campaign_templates ( name )', { count: 'exact' }).eq('organization_id', orgId)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.type) query = query.eq('campaign_type', filters.type)
  const { data, count } = await query.order('created_at', { ascending: false }).limit(50)
  return { campaigns: data ?? [], total: count ?? 0 }
}

export async function getCampaign(id: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb.from('campaigns') as any).select('*, campaign_templates ( * )').eq('id', id).single()
  return data
}

export async function createCampaign(input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('campaigns') as any).insert({ ...input, status: 'draft' }).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateCampaign(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('campaigns') as any).update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}

export async function scheduleCampaign(id: string, scheduledAt: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('campaigns') as any).update({ status: 'scheduled', send_date: scheduledAt }).eq('id', id)
}

export async function sendCampaign(id: string, orgId: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign } = await (sb.from('campaigns') as any).select('*').eq('id', id).single()
  if (!campaign) throw new AppError('NOT_FOUND', 'Campaign not found', undefined, 404)

  // Resolve audience
  let recipientCount = 0
  const { data: customers } = await sb.from('customers').select('id').eq('organization_id', orgId).eq('status', 'active').eq('opted_into_marketing', true)
  recipientCount = customers?.length ?? 0

  // In production: merge template per customer and enqueue sends
  // For now: log and update count
  logger.info('Campaign sent', { campaignId: id, recipients: recipientCount })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('campaigns') as any).update({ status: 'sent', send_complete_date: new Date().toISOString(), sending_count: recipientCount }).eq('id', id)

  return { recipients: recipientCount }
}

export async function cancelCampaign(id: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('campaigns') as any).update({ status: 'cancelled' }).eq('id', id)
}
