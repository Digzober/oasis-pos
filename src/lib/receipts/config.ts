import { z } from 'zod/v4'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import type { Json } from '@/types/database'

const HeaderConfigSchema = z.object({
  show_location_name: z.boolean(),
  show_location_address: z.boolean(),
  show_location_phone: z.boolean(),
  show_license_number: z.boolean(),
  show_employee_name: z.boolean(),
  show_customer_name: z.boolean(),
}).strict()

const LineItemConfigSchema = z.object({
  show_sku: z.boolean(),
  show_thc_percentage: z.boolean(),
  show_tax_breakdown: z.boolean(),
  show_discount_details: z.boolean(),
}).strict()

const FooterConfigSchema = z.object({
  show_loyalty_points: z.boolean(),
  show_return_policy: z.boolean(),
}).strict()

const AdditionalConfigSchema = z.object({ show_biotrack_id: z.boolean() }).strict()

export const ReceiptConfigSchema = z.object({
  header_config: HeaderConfigSchema,
  line_item_config: LineItemConfigSchema,
  footer_config: FooterConfigSchema,
  additional_config: AdditionalConfigSchema,
}).strict()

export const ReceiptConfigPatchSchema = z.object({
  header_config: HeaderConfigSchema.partial().optional(),
  line_item_config: LineItemConfigSchema.partial().optional(),
  footer_config: FooterConfigSchema.partial().optional(),
  additional_config: AdditionalConfigSchema.partial().optional(),
}).strict()

export type ReceiptConfig = z.infer<typeof ReceiptConfigSchema>
export type ReceiptDisplaySettings = ReceiptConfig['header_config']
  & ReceiptConfig['line_item_config']
  & ReceiptConfig['footer_config']
  & ReceiptConfig['additional_config']

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  header_config: {
    show_location_name: true, show_location_address: true,
    show_location_phone: true, show_license_number: true,
    show_employee_name: true, show_customer_name: true,
  },
  line_item_config: {
    show_sku: true, show_thc_percentage: true,
    show_tax_breakdown: true, show_discount_details: true,
  },
  footer_config: { show_loyalty_points: true, show_return_policy: true },
  additional_config: { show_biotrack_id: true },
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function knownValues<T extends Record<string, boolean>>(
  defaults: T,
  value: unknown,
): T {
  if (!isObject(value)) return { ...defaults }
  const stored = Object.fromEntries(
    Object.keys(defaults).flatMap((key) => typeof value[key] === 'boolean' ? [[key, value[key]]] : []),
  )
  return { ...defaults, ...stored }
}

export function normalizeReceiptConfig(value: unknown): ReceiptConfig {
  const row = isObject(value) ? value : {}
  return {
    header_config: knownValues(DEFAULT_RECEIPT_CONFIG.header_config, row.header_config),
    line_item_config: knownValues(DEFAULT_RECEIPT_CONFIG.line_item_config, row.line_item_config),
    footer_config: knownValues(DEFAULT_RECEIPT_CONFIG.footer_config, row.footer_config),
    additional_config: knownValues(DEFAULT_RECEIPT_CONFIG.additional_config, row.additional_config),
  }
}

export function flattenReceiptConfig(config: ReceiptConfig): ReceiptDisplaySettings {
  return {
    ...config.header_config,
    ...config.line_item_config,
    ...config.footer_config,
    ...config.additional_config,
  }
}

export async function getReceiptConfig(locationId: string): Promise<ReceiptConfig> {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('receipt_config')
    .select('header_config, line_item_config, footer_config, additional_config')
    .eq('location_id', locationId).eq('config_type', 'receipt').maybeSingle()
  if (error) throw new AppError('RECEIPT_CONFIG_LOAD_FAILED', error.message, error, 500)
  return normalizeReceiptConfig(data)
}

export async function patchReceiptConfig(locationId: string, patch: unknown): Promise<ReceiptConfig> {
  const parsed = ReceiptConfigPatchSchema.safeParse(patch)
  if (!parsed.success) {
    throw new AppError('INVALID_RECEIPT_CONFIG_PATCH', 'Invalid receipt config patch', parsed.error, 400)
  }
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.rpc('patch_receipt_config', {
    p_location_id: locationId,
    p_patch: parsed.data as Json,
  })
  if (error) throw new AppError('RECEIPT_CONFIG_UPDATE_FAILED', error.message, error, 500)
  return normalizeReceiptConfig(data)
}
