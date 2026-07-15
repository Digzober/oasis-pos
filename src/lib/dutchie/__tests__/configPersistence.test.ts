import { describe, expect, it, vi } from 'vitest'
import { persistDutchieDualWrite } from '../configPersistence'

describe('Dutchie authoritative loyalty dual-write', () => {
  it('writes organization state before the location config', async () => {
    const calls: string[] = []
    const result = await persistDutchieDualWrite({
      readOrganizationState: vi.fn(),
      writeOrganizationState: vi.fn(async () => {
        calls.push('organization')
        return { is_enabled: false }
      }),
      writeLocationConfig: vi.fn(async (enabled) => {
        calls.push(`location:${enabled}`)
        return { id: 'config-1' }
      }),
      reconcileLocationLoyalty: vi.fn(),
    })

    expect(calls).toEqual(['organization', 'location:false'])
    expect(result.loyaltyState.is_enabled).toBe(false)
  })

  it('reconciles to authoritative organization state and still rejects on location failure', async () => {
    const reconcile = vi.fn().mockResolvedValue(undefined)

    await expect(persistDutchieDualWrite({
      readOrganizationState: vi.fn().mockResolvedValue({ is_enabled: true }),
      writeLocationConfig: vi.fn().mockRejectedValue(new Error('location failed')),
      reconcileLocationLoyalty: reconcile,
    })).rejects.toThrow('location failed')

    expect(reconcile).toHaveBeenCalledWith(true)
  })

  it('surfaces reconciliation failure together with the location failure', async () => {
    await expect(persistDutchieDualWrite({
      readOrganizationState: vi.fn().mockResolvedValue({ is_enabled: true }),
      writeLocationConfig: vi.fn().mockRejectedValue(new Error('location failed')),
      reconcileLocationLoyalty: vi.fn().mockRejectedValue(new Error('reconcile failed')),
    })).rejects.toThrow('location write and loyalty reconciliation both failed')
  })
})
