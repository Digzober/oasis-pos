export interface DutchieLoyaltyState {
  is_enabled: boolean
  last_synced_at?: string | null
  designated_location_id?: string | null
}

interface DutchieDualWriteOperations<TConfig> {
  readOrganizationState: () => Promise<DutchieLoyaltyState>
  writeOrganizationState?: () => Promise<DutchieLoyaltyState>
  writeLocationConfig: (loyaltyEnabled: boolean) => Promise<TConfig>
  reconcileLocationLoyalty: (loyaltyEnabled: boolean) => Promise<void>
}

export async function persistDutchieDualWrite<TConfig>(
  operations: DutchieDualWriteOperations<TConfig>,
) {
  const loyaltyState = operations.writeOrganizationState
    ? await operations.writeOrganizationState()
    : await operations.readOrganizationState()

  try {
    const config = await operations.writeLocationConfig(loyaltyState.is_enabled)
    return { config, loyaltyState }
  } catch (locationError) {
    try {
      await operations.reconcileLocationLoyalty(loyaltyState.is_enabled)
    } catch (reconcileError) {
      throw new AggregateError(
        [locationError, reconcileError],
        'Dutchie location write and loyalty reconciliation both failed',
      )
    }
    throw locationError
  }
}
