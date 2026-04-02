import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('delivery_drivers')
      .select('id, name, phone, email, state_id, employee_id')
      .eq('organization_id', session.organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      logger.error('Drivers list error', { error: error.message })
      return NextResponse.json({ drivers: [] })
    }

    return NextResponse.json({ drivers: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Drivers error', { error: String(err) })
    return NextResponse.json({ drivers: [] })
  }
}
