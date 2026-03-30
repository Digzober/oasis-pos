import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    await requireSession()
    const sb = await createSupabaseServerClient()

    const { data: brands, error } = await sb
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      logger.error('Brands query failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
    }

    return NextResponse.json({ brands: brands ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Brands error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
