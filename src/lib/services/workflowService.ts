import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export async function listWorkflows(orgId: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb.from('workflows') as any).select('*').eq('organization_id', orgId).order('name')
  return data ?? []
}

export async function createWorkflow(input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('workflows') as any).insert({ ...input, status: 'draft' }).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateWorkflow(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('workflows') as any).update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}

export async function activateWorkflow(id: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('workflows') as any).update({ status: 'active' }).eq('id', id)
}

export async function pauseWorkflow(id: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('workflows') as any).update({ status: 'paused' }).eq('id', id)
}

export async function processWorkflowTrigger(triggerType: string, customerId: string, orgId: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workflows } = await (sb.from('workflows') as any).select('*').eq('organization_id', orgId).eq('status', 'active').eq('trigger_type', triggerType)

  for (const wf of workflows ?? []) {
    logger.info('Workflow triggered', { workflowId: wf.id, triggerType, customerId })
    // In production: enqueue steps for background processing
    // For now: log the trigger
  }
}
