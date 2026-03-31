import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getDeliveryConfig } from '@/lib/services/deliveryService'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try { const s = await requireSession(); return NextResponse.json({ config: await getDeliveryConfig(s.organizationId) }) }
  catch (err) { logger.error('Delivery config error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
export async function PUT(req: NextRequest) {
  try {
    const s = await requireSession(); const body = await req.json(); const sb = await createSupabaseServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (sb.from('delivery_config') as any).select('id').eq('organization_id', s.organizationId).maybeSingle()
    if (existing) { await (sb.from('delivery_config') as any).update(body).eq('id', existing.id) }
    else { await (sb.from('delivery_config') as any).insert({ organization_id: s.organizationId, ...body }) }
    return NextResponse.json({ success: true })
  } catch (err) { logger.error('Delivery config update error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
