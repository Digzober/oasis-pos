import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getEffectiveSettings } from '@/lib/settings/service'
import { AppError } from '@/lib/utils/errors'
import type { EffectiveSettings } from '@/lib/settings/schema'

export interface EffectivePrintPreferences {
  autoPrintReceipt: boolean
  autoPrintLabels: boolean
}

export interface RegisterPrintOverrides {
  auto_print_receipts: boolean | null
  auto_print_labels: boolean | null
}

export function resolveEffectivePrintPreferences(
  defaults: EffectiveSettings['printing'],
  register: RegisterPrintOverrides | null,
): EffectivePrintPreferences {
  return {
    autoPrintReceipt: register?.auto_print_receipts
      ?? defaults.auto_print_receipt_default,
    autoPrintLabels: register?.auto_print_labels
      ?? defaults.auto_print_label_default,
  }
}

export async function loadRegisterPrintOverrides(
  locationId: string,
  registerId: string,
): Promise<RegisterPrintOverrides | null> {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('registers')
    .select('auto_print_receipts, auto_print_labels')
    .eq('id', registerId).eq('location_id', locationId).maybeSingle()
  if (error) throw new AppError('PRINT_SETTINGS_LOAD_FAILED', error.message, error, 500)
  return data
}

export async function getEffectivePrintPreferences(
  locationId: string,
  registerId: string,
): Promise<EffectivePrintPreferences> {
  const [settings, register] = await Promise.all([
    getEffectiveSettings(locationId),
    loadRegisterPrintOverrides(locationId, registerId),
  ])
  return resolveEffectivePrintPreferences(settings.printing, register)
}
