import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import {
  GUESTLIST_WORKFLOW_EVENTS,
  GuestlistWorkflowPatchSchema,
  applyOrderStatusToGuestlist,
  getGuestlistWorkflowMappings,
  getGuestlistWorkflowEventsByStatusId,
  getGuestlistEventForOrderStatus,
  getGuestlistEventForSource,
  patchGuestlistWorkflowMappings,
  resolveGuestlistCheckInStatusId,
} from '../workflowMappings'

describe('guestlist workflow mappings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createSupabaseServerClient.mockResolvedValue({ rpc: mocks.rpc })
    mocks.rpc.mockResolvedValue({ data: { online_pickup: 'status-1' }, error: null })
  })

  it('uses exactly the ten approved guestlist events', () => {
    expect(GUESTLIST_WORKFLOW_EVENTS).toEqual([
      'default',
      'preorder_notify',
      'online_pickup',
      'online_delivery',
      'in_store_order',
      'curbside',
      'drive_thru',
      'skipped_delivery',
      'ready_for_delivery',
      'start_delivery_route',
    ])
  })

  it.each([
    ['walk_in', 'in_store_order'],
    ['online_pickup', 'online_pickup'],
    ['online_delivery', 'online_delivery'],
    ['curbside', 'curbside'],
    ['drive_thru', 'drive_thru'],
    ['phone', null],
    ['kiosk', null],
  ] as const)('maps queue source %s to %s', (source, event) => {
    expect(getGuestlistEventForSource(source)).toBe(event)
  })

  it.each([
    ['pending', 'preorder_notify'],
    ['ready', 'ready_for_delivery'],
    ['out_for_delivery', 'start_delivery_route'],
    ['cancelled', 'skipped_delivery'],
    ['confirmed', null],
    ['preparing', null],
    ['completed', null],
  ] as const)('maps order status %s to %s', (status, event) => {
    expect(getGuestlistEventForOrderStatus(status)).toBe(event)
  })

  it('rejects unknown workflow events', () => {
    expect(GuestlistWorkflowPatchSchema.safeParse({ invented_event: null }).success).toBe(false)
  })

  it('writes a validated key-level patch through the transactional RPC', async () => {
    const patch = { online_pickup: '00000000-0000-4000-8000-000000000001' }

    await expect(patchGuestlistWorkflowMappings('location-1', patch)).resolves.toEqual({
      online_pickup: 'status-1',
    })
    expect(mocks.rpc).toHaveBeenCalledWith('patch_guestlist_workflow_mappings', {
      p_location_id: 'location-1',
      p_patch: patch,
    })
  })

  it('loads typed mappings and keeps the status-row default authoritative', async () => {
    const mappingQuery = createQuery({
      data: [{ workflow_event: 'online_pickup', status_id: 'status-pickup' }],
      error: null,
    })
    const defaultQuery = createQuery({ data: { id: 'status-default' }, error: null })
    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => table === 'guestlist_workflow_mappings'
        ? mappingQuery
        : defaultQuery),
    })

    await expect(getGuestlistWorkflowMappings('location-1')).resolves.toMatchObject({
      default: 'status-default',
      online_pickup: 'status-pickup',
      online_delivery: null,
    })
  })

  it('indexes configured workflow events by status id for deterministic cards', async () => {
    const mappingQuery = createQuery({
      data: [
        { workflow_event: 'ready_for_delivery', status_id: 'status-ready' },
        { workflow_event: 'invented', status_id: 'status-bad' },
      ],
      error: null,
    })

    await expect(getGuestlistWorkflowEventsByStatusId(
      'location-1',
      { from: vi.fn(() => mappingQuery) } as never,
    )).resolves.toEqual({ 'status-ready': 'ready_for_delivery' })
  })

  it('propagates mapping write errors', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'mapping write failed' } })

    await expect(patchGuestlistWorkflowMappings('location-1', { default: null }))
      .rejects.toThrow('mapping write failed')
  })

  it('prefers the source mapping when choosing a queue check-in status', async () => {
    const { client } = createClient([
      { data: { status_id: 'mapped-status' }, error: null },
    ])

    await expect(resolveGuestlistCheckInStatusId(
      'location-1',
      'online_pickup',
      client,
    )).resolves.toBe('mapped-status')
  })

  it('falls back to guestlist_statuses.is_default when an event has no mapping', async () => {
    const { client } = createClient([
      { data: null, error: null },
      { data: { id: 'default-status' }, error: null },
    ])

    await expect(resolveGuestlistCheckInStatusId(
      'location-1',
      'online_pickup',
      client,
    )).resolves.toBe('default-status')
  })

  it('updates the linked queue entry when an order reaches a mapped transition', async () => {
    const { client, updates } = createClient([
      { data: { status_id: 'ready-status' }, error: null },
      { data: null, error: null },
    ])

    await expect(applyOrderStatusToGuestlist(
      'order-1',
      'location-1',
      'ready',
      client,
    )).resolves.toBe(true)
    expect(updates).toEqual([{ table: 'guestlist_entries', payload: { status_id: 'ready-status' } }])
  })

  it('propagates linked queue transition failures', async () => {
    const { client } = createClient([
      { data: { status_id: 'ready-status' }, error: null },
      { data: null, error: { message: 'queue update failed' } },
    ])

    await expect(applyOrderStatusToGuestlist(
      'order-1',
      'location-1',
      'ready',
      client,
    )).rejects.toThrow('queue update failed')
  })
})

function createQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
  return query
}

function createClient(results: Array<{ data: unknown; error: unknown }>) {
  const updates: Array<{ table: string; payload: unknown }> = []
  const client = {
    from: vi.fn((table: string) => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        update: vi.fn((payload: unknown) => {
          updates.push({ table, payload })
          return query
        }),
        maybeSingle: vi.fn(() => Promise.resolve(results.shift())),
        then: (resolve: (value: { data: unknown; error: unknown } | undefined) => unknown) =>
          Promise.resolve(results.shift()).then(resolve),
      }
      return query
    }),
  }
  return { client: client as never, updates }
}
