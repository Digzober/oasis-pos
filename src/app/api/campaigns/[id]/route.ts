import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.string().optional(),
  subject: z.string().max(500).optional(),
  preview_text: z.string().max(500).optional(),
  sender_email: z.string().email().optional(),
  send_date: z.string().optional(),
  segment_ids: z.array(z.uuid()).optional(),
  tag_ids: z.array(z.uuid()).optional(),
  template_id: z.uuid().optional(),
  campaign_type: z.string().optional(),
  channel: z.string().optional(),
  smart_sending: z.boolean().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('campaigns')
      .select('*, campaign_templates:template_id ( id, name, html_content )')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaign: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Campaign GET error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const body = await req.json()
    const parsed = UpdateCampaignSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { data, error } = await sb
      .from('campaigns')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaign: data })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Campaign PATCH error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
