import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { assertOrgOwnership } from '@/lib/auth/ownership'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CreateAssignmentSchema = z.object({
  register_id: z.string().uuid(),
  assignment_type: z.enum(['labels', 'receipts']),
  is_default: z.boolean().optional(),
})

const DeleteAssignmentSchema = z.object({
  assignment_id: z.string().uuid(),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    if (!await assertOrgOwnership('printers', id, session.organizationId, undefined, session.locationId)) return NextResponse.json({ error: 'Printer not found' }, { status: 404 })
    const sb = await createSupabaseServerClient()

    const { data: assignments, error } = await (sb.from('printer_assignments') as any)
      .select('*, registers(name)')
      .eq('printer_id', id)
      .order('created_at')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ assignments: assignments ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Printer assignments list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    if (!await assertOrgOwnership('printers', id, session.organizationId, undefined, session.locationId)) return NextResponse.json({ error: 'Printer not found' }, { status: 404 })
    const body = await request.json()
    const parsed = CreateAssignmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }
    if (!await assertOrgOwnership('registers', parsed.data.register_id, session.organizationId, undefined, session.locationId)) return NextResponse.json({ error: 'Register not found' }, { status: 404 })
    const sb = await createSupabaseServerClient()

    const { data: assignment, error } = await (sb.from('printer_assignments') as any)
      .insert({ ...parsed.data, printer_id: id })
      .select('*, registers(name)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Printer assignment create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = DeleteAssignmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }
    if (!await assertOrgOwnership('printer_assignments', parsed.data.assignment_id, session.organizationId, undefined, session.locationId)) return NextResponse.json({ error: 'Printer assignment not found' }, { status: 404 })
    const sb = await createSupabaseServerClient()

    const { error } = await (sb.from('printer_assignments') as any)
      .delete()
      .eq('id', parsed.data.assignment_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Printer assignment delete error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
