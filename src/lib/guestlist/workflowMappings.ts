import { z } from 'zod/v4'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const GUESTLIST_WORKFLOW_EVENTS = [
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
] as const

export type GuestlistWorkflowEvent = typeof GUESTLIST_WORKFLOW_EVENTS[number]

export const GuestlistWorkflowEventSchema = z.enum(GUESTLIST_WORKFLOW_EVENTS)

const statusId = z.uuid().nullable()
export const GuestlistWorkflowPatchSchema = z.object({
  default: statusId.optional(),
  preorder_notify: statusId.optional(),
  online_pickup: statusId.optional(),
  online_delivery: statusId.optional(),
  in_store_order: statusId.optional(),
  curbside: statusId.optional(),
  drive_thru: statusId.optional(),
  skipped_delivery: statusId.optional(),
  ready_for_delivery: statusId.optional(),
  start_delivery_route: statusId.optional(),
}).strict()

export type GuestlistWorkflowPatch = z.infer<typeof GuestlistWorkflowPatchSchema>
export type GuestlistWorkflowMappings = Record<GuestlistWorkflowEvent, string | null>

export type GuestlistWorkflowEventsByStatusId = Record<string, GuestlistWorkflowEvent>

export type GuestlistSource =
  | 'walk_in' | 'online_pickup' | 'online_delivery' | 'curbside'
  | 'drive_thru' | 'phone' | 'kiosk'

export type OnlineOrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'ready'
  | 'out_for_delivery' | 'completed' | 'cancelled'

const SOURCE_EVENTS: Partial<Record<GuestlistSource, GuestlistWorkflowEvent>> = {
  walk_in: 'in_store_order',
  online_pickup: 'online_pickup',
  online_delivery: 'online_delivery',
  curbside: 'curbside',
  drive_thru: 'drive_thru',
}

const ORDER_STATUS_EVENTS: Partial<Record<OnlineOrderStatus, GuestlistWorkflowEvent>> = {
  pending: 'preorder_notify',
  ready: 'ready_for_delivery',
  out_for_delivery: 'start_delivery_route',
  cancelled: 'skipped_delivery',
}

export function getGuestlistEventForSource(source: GuestlistSource) {
  return SOURCE_EVENTS[source] ?? null
}

export function getGuestlistEventForOrderStatus(status: OnlineOrderStatus) {
  return ORDER_STATUS_EVENTS[status] ?? null
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export async function resolveGuestlistCheckInStatusId(
  locationId: string,
  source: GuestlistSource,
  client?: SupabaseServerClient,
) {
  const sb = client ?? await createSupabaseServerClient()
  const event = getGuestlistEventForSource(source)
  const mappedStatusId = event ? await getMappedStatusId(sb, locationId, event) : null
  if (mappedStatusId) return mappedStatusId

  const defaultStatusId = await getFallbackStatusId(sb, locationId, true)
  if (defaultStatusId) return defaultStatusId
  return getFallbackStatusId(sb, locationId, false)
}

export async function applyOrderStatusToGuestlist(
  orderId: string,
  locationId: string,
  status: OnlineOrderStatus,
  client?: SupabaseServerClient,
) {
  const event = getGuestlistEventForOrderStatus(status)
  if (!event) return false
  const sb = client ?? await createSupabaseServerClient()
  const statusId = await getMappedStatusId(sb, locationId, event)
  if (!statusId) return false

  const { error } = await sb.from('guestlist_entries')
    .update({ status_id: statusId })
    .eq('online_order_id', orderId)
    .eq('location_id', locationId)
  if (error) throw new Error(error.message)
  return true
}

export async function getGuestlistWorkflowEventsByStatusId(
  locationId: string,
  client?: SupabaseServerClient,
): Promise<GuestlistWorkflowEventsByStatusId> {
  const sb = client ?? await createSupabaseServerClient()
  const { data, error } = await sb.from('guestlist_workflow_mappings')
    .select('workflow_event, status_id')
    .eq('location_id', locationId)
  if (error) throw new Error(error.message)

  const events: GuestlistWorkflowEventsByStatusId = {}
  for (const row of data ?? []) {
    const event = GuestlistWorkflowEventSchema.safeParse(row.workflow_event)
    if (event.success && row.status_id) events[row.status_id] = event.data
  }
  return events
}

async function getMappedStatusId(
  sb: SupabaseServerClient,
  locationId: string,
  event: GuestlistWorkflowEvent,
) {
  const { data, error } = await sb.from('guestlist_workflow_mappings')
    .select('status_id')
    .eq('location_id', locationId)
    .eq('workflow_event', event)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data?.status_id ?? null
}

async function getFallbackStatusId(
  sb: SupabaseServerClient,
  locationId: string,
  isDefault: boolean,
) {
  let query = sb.from('guestlist_statuses')
    .select('id')
    .eq('location_id', locationId)
    .eq('is_active', true)
  if (isDefault) query = query.eq('is_default', true)
  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data?.id ?? null
}

export async function getGuestlistWorkflowMappings(locationId: string) {
  const sb = await createSupabaseServerClient()
  const { data: rows, error } = await sb.from('guestlist_workflow_mappings')
    .select('workflow_event, status_id')
    .eq('location_id', locationId)
  if (error) throw new Error(error.message)

  const { data: defaultStatus, error: defaultError } = await sb.from('guestlist_statuses')
    .select('id')
    .eq('location_id', locationId)
    .eq('is_default', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (defaultError) throw new Error(defaultError.message)

  const mappings = emptyWorkflowMappings()
  mappings.default = defaultStatus?.id ?? null
  for (const row of rows ?? []) {
    const event = GuestlistWorkflowEventSchema.safeParse(row.workflow_event)
    if (event.success && event.data !== 'default') mappings[event.data] = row.status_id
  }
  return mappings
}

function emptyWorkflowMappings(): GuestlistWorkflowMappings {
  return Object.fromEntries(
    GUESTLIST_WORKFLOW_EVENTS.map((event) => [event, null]),
  ) as GuestlistWorkflowMappings
}

export async function patchGuestlistWorkflowMappings(
  locationId: string,
  patch: GuestlistWorkflowPatch,
) {
  const validatedPatch = GuestlistWorkflowPatchSchema.parse(patch)
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.rpc('patch_guestlist_workflow_mappings', {
    p_location_id: locationId,
    p_patch: validatedPatch,
  })
  if (error) throw new Error(error.message)
  return data as Record<string, string | null>
}
