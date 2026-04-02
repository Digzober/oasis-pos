import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  license_number: z.string().optional(),
  phone: z.string().optional(),
  email: z.email().optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const body = await request.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })

    const sb = await createSupabaseServerClient()
    const { data, error } = await sb
      .from('doctors')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ doctor: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Doctor update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params

    const sb = await createSupabaseServerClient()
    const { error } = await sb
      .from('doctors')
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Doctor delete error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
