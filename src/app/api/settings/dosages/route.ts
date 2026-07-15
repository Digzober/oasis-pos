import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CreateDosageSchema = z.object({ name: z.string().trim().min(1).max(100) }).strict()

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('dosage_presets')
      .select('*')
      .eq('organization_id', session.organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      logger.error('Dosage presets list error', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch dosage presets' }, { status: 500 })
    }

    return NextResponse.json({ dosages: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Dosage presets error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const parsed = CreateDosageSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const { data, error } = await sb
      .from('dosage_presets')
      .insert({
        organization_id: session.organizationId,
        name: parsed.data.name,
      })
      .select()
      .single()

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json({ error: 'A dosage preset with this name already exists' }, { status: 409 })
      }
      logger.error('Dosage preset create error', { error: error.message })
      return NextResponse.json({ error: 'Failed to create dosage preset' }, { status: 500 })
    }

    return NextResponse.json({ dosage: data }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Dosage preset create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
