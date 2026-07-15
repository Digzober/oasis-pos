import { getEffectiveSettings } from '@/lib/settings/service'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

interface CheckoutGateInput {
  locationId: string
  organizationId: string
  customerId: string | null
}

export async function enforceCheckoutRequirements({
  locationId,
  organizationId,
  customerId,
}: CheckoutGateInput): Promise<void> {
  const settings = await getEffectiveSettings(locationId)
  if (settings.checkout.require_customer && !customerId) {
    throw new AppError('CUSTOMER_REQUIRED', 'A customer is required for checkout', undefined, 400)
  }
  if (!settings.compliance.require_id_scan) return
  if (!customerId) {
    throw new AppError('VERIFIED_ID_REQUIRED', 'A customer with verified ID is required', undefined, 400)
  }

  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('customers')
    .select('id_type, id_number_hash')
    .eq('id', customerId)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (error) {
    throw new AppError('CUSTOMER_ID_CHECK_FAILED', 'Unable to verify customer ID', error, 500)
  }
  if (!data?.id_type || !data.id_number_hash) {
    throw new AppError('VERIFIED_ID_REQUIRED', 'Customer must have verified ID before checkout', undefined, 400)
  }
}
