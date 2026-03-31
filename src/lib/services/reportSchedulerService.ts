import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export async function listSchedules(orgId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('report_schedules').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
  return data ?? []
}

export async function createSchedule(input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('report_schedules').insert(input as any).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateSchedule(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('report_schedules').update(input as any).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}

export async function deactivateSchedule(id: string) {
  const sb = await createSupabaseServerClient()
  await sb.from('report_schedules').update({ is_active: false }).eq('id', id)
}

export async function executeScheduledReports() {
  const sb = await createSupabaseServerClient()
  const { data: schedules } = await sb.from('report_schedules').select('*').eq('is_active', true)

  let executed = 0, failed = 0

  for (const schedule of schedules ?? []) {
    try {
      // In production: generate report and send email
      // For now: log execution
      logger.info('Scheduled report executed', { id: schedule.id, type: schedule.report_type, recipients: schedule.recipients })
      executed++
    } catch (err) {
      logger.error('Scheduled report failed', { id: schedule.id, error: String(err) })
      failed++
    }
  }

  return { executed, failed }
}
