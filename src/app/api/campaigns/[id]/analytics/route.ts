import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const ZEROED_ANALYTICS = {
  campaign_id: '',
  total_sent: 0,
  total_delivered: 0,
  total_opened: 0,
  total_clicked: 0,
  total_bounced: 0,
  total_unsubscribed: 0,
  total_complained: 0,
  total_converted: 0,
  total_revenue: 0,
  open_rate: 0,
  click_rate: 0,
  bounce_rate: 0,
  unsubscribe_rate: 0,
  conversion_rate: 0,
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { data, error } = await (sb.from('campaign_analytics') as any)
      .select('*')
      .eq('campaign_id', id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      analytics: data ?? { ...ZEROED_ANALYTICS, campaign_id: id },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Campaign analytics GET error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
