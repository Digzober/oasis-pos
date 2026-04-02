import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CreatePrinterSchema = z.object({
  name: z.string().min(1),
  printer_id: z.string().optional(),
  printer_type: z.string().optional(),
  computer_name: z.string().optional(),
  supports_labels: z.boolean().optional(),
  supports_receipts: z.boolean().optional(),
  connection_type: z.string().optional(),
  ip_address: z.string().optional(),
  port: z.number().int().optional(),
})

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data: printers, error } = await (sb.from('printers') as any)
      .select('*')
      .eq('location_id', session.locationId)
      .eq('is_active', true)
      .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ printers: printers ?? [] })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Printers list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = CreatePrinterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { data: printer, error } = await (sb.from('printers') as any)
      .insert({ ...parsed.data, location_id: session.locationId })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ printer }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Printer create error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
