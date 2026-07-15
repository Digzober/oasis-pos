import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateDosageSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
}).strict()

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const { id } = await params
    const parsed = UpdateDosageSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const { data, error } = await sb
      .from('dosage_presets')
      .update(parsed.data)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .select()
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'A dosage preset with this name already exists' }, { status: 409 })
      }
      logger.error('Dosage preset update error', { error: error.message })
      return NextResponse.json({ error: 'Failed to update dosage preset' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Dosage preset not found' }, { status: 404 })
    }

    return NextResponse.json({ dosage: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Dosage preset update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const { id } = await params

    const { error } = await sb
      .from('dosage_presets')
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', session.organizationId)

    if (error) {
      logger.error('Dosage preset deactivate error', { error: error.message })
      return NextResponse.json({ error: 'Failed to deactivate dosage preset' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Dosage preset deactivate error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
