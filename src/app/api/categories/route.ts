import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    await requireSession()
    const sb = await createSupabaseServerClient()

    const { data: categories, error } = await sb
      .from('product_categories')
      .select('*, parent:product_categories!parent_id ( id, name, slug )')
      .eq('is_active', true)
      .order('sort_order')
      .order('name')

    if (error) {
      logger.error('Categories query failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    return NextResponse.json({ categories: categories ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Categories error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
