import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  adjustInventory: vi.fn(),
  updateOrderStatus: vi.fn(),
  updateWorkflow: vi.fn(),
  voidTransaction: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({
  requireSession: vi.fn().mockResolvedValue({
    employeeId: 'employee-local',
    organizationId: 'org-local',
    locationId: 'location-local',
    role: 'admin',
    permissions: [],
  }),
}))

vi.mock('@/lib/auth/permissions', () => ({
  hasPermission: vi.fn().mockReturnValue(true),
  PERMISSIONS: {
    ADJUST_INVENTORY: 'adjust_inventory',
    ADMINISTRATOR: 'administrator',
    POS_MANAGER: 'pos_manager',
  },
}))

vi.mock('@/lib/services/inventoryAdjustmentService', () => ({
  adjustInventory: mocks.adjustInventory,
}))

vi.mock('@/lib/services/onlineOrderService', () => ({
  getOrderStatus: vi.fn(),
  updateOrderStatus: mocks.updateOrderStatus,
}))

vi.mock('@/lib/services/voidReturnService', () => ({
  voidTransaction: mocks.voidTransaction,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      upsert: vi.fn(),
      delete: vi.fn(),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mocks.updateWorkflow.mockResolvedValue({
              data: { id: 'workflow-foreign' },
              error: null,
            }),
          }),
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { PATCH as patchCustomerGroups } from '@/app/api/customers/[id]/groups/route'
import { PATCH as patchOrder } from '@/app/api/orders/[id]/route'
import { PATCH as patchWorkflow } from '@/app/api/workflows/[id]/route'
import { POST as adjustInventory } from '@/app/api/inventory/[id]/adjust/route'
import { POST as voidTransaction } from '@/app/api/transactions/[id]/void/route'

const context = (id: string) => ({ params: Promise.resolve({ id }) })

describe('foreign-organization resource IDs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.adjustInventory.mockResolvedValue({ success: true })
    mocks.updateOrderStatus.mockResolvedValue(undefined)
    mocks.voidTransaction.mockResolvedValue({ success: true })
  })

  it('rejects a foreign customer before changing group membership', async () => {
    const response = await patchCustomerGroups(
      new Request('http://localhost/api/customers/customer-foreign/groups', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }) as never,
      context('customer-foreign'),
    )

    expect(response.status).toBe(404)
  })

  it('rejects a foreign order before changing its status', async () => {
    const response = await patchOrder(
      new Request('http://localhost/api/orders/order-foreign', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      }) as never,
      context('order-foreign'),
    )

    expect(response.status).toBe(404)
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled()
  })

  it('rejects a foreign workflow before updating it', async () => {
    const response = await patchWorkflow(
      new Request('http://localhost/api/workflows/workflow-foreign', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Cross-tenant change' }),
      }) as never,
      context('workflow-foreign'),
    )

    expect(response.status).toBe(404)
  })

  it('rejects a foreign inventory item before adjustment', async () => {
    const response = await adjustInventory(
      new Request('http://localhost/api/inventory/inventory-foreign/adjust', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          adjustment_type: 'count_correction',
          new_quantity: 1,
          reason: 'Counted',
        }),
      }) as never,
      context('inventory-foreign'),
    )

    expect(response.status).toBe(404)
    expect(mocks.adjustInventory).not.toHaveBeenCalled()
  })

  it('rejects a foreign transaction before voiding it', async () => {
    const response = await voidTransaction(
      new Request('http://localhost/api/transactions/transaction-foreign/void', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ void_reason: 'Duplicate' }),
      }) as never,
      context('transaction-foreign'),
    )

    expect(response.status).toBe(404)
    expect(mocks.voidTransaction).not.toHaveBeenCalled()
  })
})
