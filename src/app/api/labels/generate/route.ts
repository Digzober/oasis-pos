import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { getTemplate, generateLabelData, generateLabelHtml } from '@/lib/services/labelService'
import { logger } from '@/lib/utils/logger'

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { template_id, inventory_item_id } = await req.json()

    const template = await getTemplate(template_id)
    const data = await generateLabelData(inventory_item_id)
    const html = generateLabelHtml(data, template)

    return NextResponse.json({ data, html, template })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) { const a = err as { code: string; message: string; statusCode?: number }; return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 }) }
    logger.error('Label generate error', { error: String(err) }); return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
