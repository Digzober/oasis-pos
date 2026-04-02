import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { clearBioTrackConfigCache } from '@/lib/biotrack/configLoader'
import { logger } from '@/lib/utils/logger'

/** Front-end field names → clean names the UI works with */
const UpdateBiotrackConfigSchema = z.object({
  is_enabled: z.boolean().optional(),
  state_code: z.string().optional(),
  xml_api_url: z.string().optional(),
  rest_api_url: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  ubi: z.string().optional(),
  biotrack_location_id: z.string().optional(),
  use_training_mode: z.boolean().optional(),
  use_other_plant_material: z.boolean().optional(),
  use_allotment_check: z.boolean().optional(),
  report_discounted_prices: z.boolean().optional(),
  enable_deliveries: z.boolean().optional(),
  use_lab_data: z.boolean().optional(),
  default_labs_in_receive: z.boolean().optional(),
  display_approval_date: z.boolean().optional(),
  schedule_returns_for_destruction: z.boolean().optional(),
})

const DEFAULT_CONFIG = {
  is_enabled: true,
  state_code: 'NM',
  xml_api_url: '',
  rest_api_url: '',
  username: '',
  password: '',
  ubi: '',
  biotrack_location_id: '',
  use_training_mode: false,
  use_other_plant_material: false,
  use_allotment_check: true,
  report_discounted_prices: false,
  enable_deliveries: false,
  use_lab_data: true,
  default_labs_in_receive: true,
  display_approval_date: false,
  schedule_returns_for_destruction: false,
}

/** Map DB row column names to clean front-end field names */
function dbRowToFrontend(row: Record<string, unknown>) {
  return {
    is_enabled: row.is_enabled ?? DEFAULT_CONFIG.is_enabled,
    state_code: row.state_code ?? DEFAULT_CONFIG.state_code,
    xml_api_url: row.xml_api_url ?? '',
    rest_api_url: row.rest_api_url ?? '',
    username: row.username_encrypted ?? '',
    password: row.password_encrypted ?? '',
    ubi: row.ubi ?? '',
    biotrack_location_id: row.biotrack_location_id ?? '',
    use_training_mode: row.use_training_mode ?? false,
    use_other_plant_material: row.use_other_plant_material ?? false,
    use_allotment_check: row.use_allotment_check ?? true,
    report_discounted_prices: row.report_discounted_prices ?? false,
    enable_deliveries: row.enable_deliveries ?? false,
    use_lab_data: row.use_lab_data ?? true,
    default_labs_in_receive: row.default_labs_in_receive ?? true,
    display_approval_date: row.display_approval_date ?? false,
    schedule_returns_for_destruction: row.schedule_returns_for_destruction ?? false,
  }
}

/** Map clean front-end field names to DB column names for upsert */
function frontendToDbRow(data: Record<string, unknown>, locationId: string) {
  const row: Record<string, unknown> = { location_id: locationId, updated_at: new Date().toISOString() }

  // Direct 1:1 mappings (field name = column name)
  const directFields = [
    'is_enabled', 'state_code', 'xml_api_url', 'rest_api_url', 'ubi',
    'biotrack_location_id', 'use_training_mode', 'use_other_plant_material',
    'use_allotment_check', 'report_discounted_prices', 'enable_deliveries',
    'use_lab_data', 'default_labs_in_receive', 'display_approval_date',
    'schedule_returns_for_destruction',
  ]
  for (const field of directFields) {
    if (data[field] !== undefined) row[field] = data[field]
  }

  // Renamed fields: frontend → DB column
  if (data.username !== undefined) row.username_encrypted = data.username
  if (data.password !== undefined) row.password_encrypted = data.password

  return row
}

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data: config, error } = await (sb.from('biotrack_config') as any)
      .select('*')
      .eq('location_id', session.locationId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      config: config ? dbRowToFrontend(config) : DEFAULT_CONFIG,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('BioTrack config get error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = UpdateBiotrackConfigSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const dbRow = frontendToDbRow(parsed.data as Record<string, unknown>, session.locationId)

    const { data: config, error } = await (sb.from('biotrack_config') as any)
      .upsert(dbRow, { onConflict: 'location_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Clear the cached config so BioTrack clients pick up changes immediately
    clearBioTrackConfigCache(session.locationId)

    return NextResponse.json({ config: dbRowToFrontend(config) })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('BioTrack config update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
