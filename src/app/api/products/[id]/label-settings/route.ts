import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { data } = await sb
      .from('product_label_settings')
      .select('*, label_templates ( id, name, label_type )')
      .eq('product_id', id)

    return NextResponse.json({ settings: data ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Label settings error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession()
    const { id: productId } = await params
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const settings: Array<{
      customer_type: string
      label_template_id: string | null
      print_quantity: number
      enabled: boolean
    }> = body.settings ?? []

    // Remove existing settings
    await sb.from('product_label_settings').delete().eq('product_id', productId)

    // Insert new settings
    if (settings.length > 0) {
      const rows = settings
        .filter(s => s.label_template_id)
        .map(s => ({
          product_id: productId,
          customer_type: s.customer_type,
          label_template_id: s.label_template_id,
          print_quantity: s.print_quantity ?? 1,
          enabled: s.enabled ?? true,
        }))

      if (rows.length > 0) {
        const { error } = await sb.from('product_label_settings').insert(rows)
        if (error) {
          logger.error('Label settings save error', { error: error.message })
          return NextResponse.json({ error: 'Failed to save label settings' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Label settings update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
