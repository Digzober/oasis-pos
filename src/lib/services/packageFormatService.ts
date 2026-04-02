import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface PackageFormat {
  id: string
  name: string
  category_id: string | null
  format: string
  is_active: boolean
}

export interface PackageIdContext {
  productName: string
  sku: string
  strainName: string
  categoryName: string
  brandName: string
  locationName: string
}

const SETTINGS_KEY = 'package_id_formats'

const SAMPLE_CONTEXT: PackageIdContext = {
  productName: 'Blue Dream Pre-Roll 1g',
  sku: 'BD-PR-1G',
  strainName: 'Blue Dream',
  categoryName: 'Pre-Rolls',
  brandName: 'Oasis',
  locationName: 'Albuquerque',
}

let sequenceCounter = 0

function abbreviate(value: string, length: number): string {
  return value
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, length)
    .toUpperCase()
}

function formatDate(pattern: string): string {
  const now = new Date()
  const yyyy = now.getFullYear().toString()
  const yy = yyyy.substring(2)
  const MM = (now.getMonth() + 1).toString().padStart(2, '0')
  const dd = now.getDate().toString().padStart(2, '0')

  const replacements: Record<string, string> = {
    yyyyMMdd: `${yyyy}${MM}${dd}`,
    yyMMdd: `${yy}${MM}${dd}`,
    MMddyyyy: `${MM}${dd}${yyyy}`,
    'yyyy-MM-dd': `${yyyy}-${MM}-${dd}`,
  }

  return replacements[pattern] ?? `${yyyy}${MM}${dd}`
}

function generateRandom(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function resolveToken(token: string, context: PackageIdContext): string {
  if (token.startsWith('date:')) {
    return formatDate(token.substring(5))
  }

  if (token.startsWith('seq:D')) {
    const digits = parseInt(token.substring(5), 10)
    if (isNaN(digits) || digits < 1 || digits > 10) {
      return token
    }
    sequenceCounter++
    return sequenceCounter.toString().padStart(digits, '0')
  }

  if (token.startsWith('random:')) {
    const length = parseInt(token.substring(7), 10)
    if (isNaN(length) || length < 1 || length > 20) {
      return token
    }
    return generateRandom(length)
  }

  switch (token) {
    case 'strain':
      return abbreviate(context.strainName, 3)
    case 'sku':
      return context.sku.toUpperCase()
    case 'category':
      return abbreviate(context.categoryName, 3)
    case 'brand':
      return abbreviate(context.brandName, 3)
    case 'location':
      return abbreviate(context.locationName, 3)
    default:
      return `{${token}}`
  }
}

export function generatePackageId(format: string, context: PackageIdContext): string {
  return format.replace(/\{([^}]+)\}/g, (_match, token: string) => {
    return resolveToken(token.trim(), context)
  })
}

export function previewFormat(format: string): string {
  sequenceCounter = 0
  return generatePackageId(format, SAMPLE_CONTEXT)
}

export async function getFormats(locationId: string): Promise<PackageFormat[]> {
  try {
    const sb = await createSupabaseServerClient()
    const { data } = await sb
      .from('location_settings')
      .select('settings')
      .eq('location_id', locationId)
      .maybeSingle()

    if (!data?.settings) {
      return []
    }

    const settings = data.settings as Record<string, unknown>
    const stored = settings[SETTINGS_KEY]

    if (!Array.isArray(stored)) {
      return []
    }

    return stored as PackageFormat[]
  } catch (err) {
    logger.error('Failed to read package formats', { error: String(err), locationId })
    return []
  }
}

export async function saveFormats(locationId: string, formats: PackageFormat[]): Promise<PackageFormat[]> {
  const sb = await createSupabaseServerClient()

  const { data: existing } = await sb
    .from('location_settings')
    .select('id, settings')
    .eq('location_id', locationId)
    .maybeSingle()

  if (existing) {
    const merged = {
      ...(existing.settings as Record<string, unknown> ?? {}),
      [SETTINGS_KEY]: formats,
    }
    const { error } = await sb
      .from('location_settings')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ settings: merged as any })
      .eq('id', existing.id)

    if (error) {
      logger.error('Failed to update package formats', { error: error.message, locationId })
      throw error
    }
  } else {
    const { error } = await sb
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('location_settings' as any)
      .insert({ location_id: locationId, settings: { [SETTINGS_KEY]: formats } })

    if (error) {
      logger.error('Failed to insert package formats', { error: error.message, locationId })
      throw error
    }
  }

  logger.info('Package formats saved', { locationId, count: formats.length })
  return formats
}

export const SUPPORTED_TOKENS = [
  { token: '{date:yyyyMMdd}', description: 'Current date as 20260331', example: '20260331' },
  { token: '{date:yyMMdd}', description: 'Current date as 260331', example: '260331' },
  { token: '{date:MMddyyyy}', description: 'Current date as 03312026', example: '03312026' },
  { token: '{date:yyyy-MM-dd}', description: 'Current date as 2026-03-31', example: '2026-03-31' },
  { token: '{seq:D4}', description: 'Sequential number, 4 digits', example: '0001' },
  { token: '{seq:D6}', description: 'Sequential number, 6 digits', example: '000001' },
  { token: '{strain}', description: 'Strain abbreviation (first 3 chars)', example: 'BLU' },
  { token: '{sku}', description: 'Product SKU', example: 'BD-PR-1G' },
  { token: '{category}', description: 'Category abbreviation (first 3 chars)', example: 'PRE' },
  { token: '{brand}', description: 'Brand abbreviation (first 3 chars)', example: 'OAS' },
  { token: '{location}', description: 'Location abbreviation (first 3 chars)', example: 'ALB' },
  { token: '{random:4}', description: '4 random alphanumeric characters', example: 'A7K2' },
  { token: '{random:6}', description: '6 random alphanumeric characters', example: 'B3M9X1' },
] as const
