import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const UpdatePrintServiceSchema = z.object({
  service_type: z.string().optional(),
  apiKey: z.string().min(1).optional(),
  account_email: z.string().email().optional(),
  is_active: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

function safeConfig(config: Record<string, unknown> | null) {
  const storedKey = typeof config?.api_key_encrypted === 'string' ? config.api_key_encrypted : ''
  if (!config) {
    return { service_type: null, account_email: null, is_active: false, config: {}, hasApiKey: false, apiKeyTail: null }
  }
  const { api_key_encrypted: _secret, ...safe } = config
  return {
    ...safe,
    hasApiKey: Boolean(storedKey),
    apiKeyTail: storedKey ? `••••${storedKey.slice(-4)}` : null,
  }
}

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data: config, error } = await (sb.from('print_service_config') as any)
      .select('*')
      .eq('location_id', session.locationId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ config: safeConfig(config as Record<string, unknown> | null) })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Print service config get error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = UpdatePrintServiceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { apiKey, ...safeInput } = parsed.data
    const updates: Record<string, unknown> = {
      ...safeInput,
      location_id: session.locationId,
      updated_at: new Date().toISOString(),
    }
    if (apiKey) updates.api_key_encrypted = apiKey

    const { data: config, error } = await (sb.from('print_service_config') as any)
      .upsert(
        updates,
        { onConflict: 'location_id' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ config: safeConfig(config as Record<string, unknown>) })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Print service config update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
