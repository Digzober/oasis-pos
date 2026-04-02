import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CustomerStatusEnum = z.enum(['active', 'banned', 'inactive'])

const ChangeStatusSchema = z.object({
  action: z.literal('change_status'),
  customer_ids: z.array(z.uuid()).min(1).max(100),
  status: CustomerStatusEnum,
  reason: z.string().max(500).optional(),
})

const ChangeTypeSchema = z.object({
  action: z.literal('change_type'),
  customer_ids: z.array(z.uuid()).min(1).max(100),
  customer_type: z.string().min(1).max(50),
})

const ArchiveSchema = z.object({
  action: z.literal('archive'),
  customer_ids: z.array(z.uuid()).min(1).max(100),
})

const BulkSchema = z.discriminatedUnion('action', [
  ChangeStatusSchema,
  ChangeTypeSchema,
  ArchiveSchema,
])

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = BulkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const data = parsed.data
    const sb = await createSupabaseServerClient()

    // Validate all customer IDs exist within the org
    const { data: existing, error: lookupError } = await sb
      .from('customers')
      .select('id')
      .in('id', data.customer_ids)
      .eq('organization_id', session.organizationId)

    if (lookupError) {
      logger.error('Bulk customer lookup failed', { error: lookupError.message })
      return NextResponse.json({ error: 'Failed to validate customers' }, { status: 500 })
    }

    const foundIds = new Set((existing ?? []).map((c) => c.id))
    const missing = data.customer_ids.filter((id) => !foundIds.has(id))

    if (missing.length > 0) {
      return NextResponse.json({ error: 'Some customer IDs not found', missing }, { status: 404 })
    }

    if (data.action === 'change_status') {
      const updatePayload: Record<string, unknown> = { status: data.status }
      if (data.status === 'banned' && data.reason) {
        updatePayload.ban_reason = data.reason
      }

      const { error: updateError } = await sb
        .from('customers')
        .update(updatePayload)
        .in('id', data.customer_ids)
        .eq('organization_id', session.organizationId)

      if (updateError) {
        logger.error('Bulk status update failed', { error: updateError.message })
        return NextResponse.json({ error: 'Failed to update customer status' }, { status: 500 })
      }

      // Audit log per customer
      const auditRows = data.customer_ids.map((customerId) => ({
        organization_id: session.organizationId,
        entity_type: 'customer',
        entity_id: customerId,
        event_type: 'update',
        details: { field: 'status', new_value: data.status, reason: data.reason ?? null },
        performed_by: session.employeeId,
      }))

      const { error: auditError } = await sb.from('audit_log').insert(auditRows)
      if (auditError) {
        logger.error('Bulk status audit log failed', { error: auditError.message })
      }

      return NextResponse.json({ success: true, updated: data.customer_ids.length })
    }

    if (data.action === 'change_type') {
      const { error: updateError } = await sb
        .from('customers')
        .update({ customer_type: data.customer_type })
        .in('id', data.customer_ids)
        .eq('organization_id', session.organizationId)

      if (updateError) {
        logger.error('Bulk type update failed', { error: updateError.message })
        return NextResponse.json({ error: 'Failed to update customer type' }, { status: 500 })
      }

      const auditRows = data.customer_ids.map((customerId) => ({
        organization_id: session.organizationId,
        entity_type: 'customer',
        entity_id: customerId,
        event_type: 'update',
        details: { field: 'customer_type', new_value: data.customer_type },
        performed_by: session.employeeId,
      }))

      const { error: auditError } = await sb.from('audit_log').insert(auditRows)
      if (auditError) {
        logger.error('Bulk type audit log failed', { error: auditError.message })
      }

      return NextResponse.json({ success: true, updated: data.customer_ids.length })
    }

    if (data.action === 'archive') {
      const now = new Date().toISOString()

      const { error: updateError } = await sb
        .from('customers')
        .update({ is_active: false, deactivated_at: now })
        .in('id', data.customer_ids)
        .eq('organization_id', session.organizationId)

      if (updateError) {
        logger.error('Bulk archive failed', { error: updateError.message })
        return NextResponse.json({ error: 'Failed to archive customers' }, { status: 500 })
      }

      const auditRows = data.customer_ids.map((customerId) => ({
        organization_id: session.organizationId,
        entity_type: 'customer',
        entity_id: customerId,
        event_type: 'update',
        details: { field: 'is_active', new_value: false },
        performed_by: session.employeeId,
      }))

      const { error: auditError } = await sb.from('audit_log').insert(auditRows)
      if (auditError) {
        logger.error('Bulk archive audit log failed', { error: auditError.message })
      }

      return NextResponse.json({ success: true, updated: data.customer_ids.length })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Bulk customer operation error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
