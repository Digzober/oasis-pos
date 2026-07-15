import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/utils/money'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import { getEffectiveSettings } from '@/lib/settings/service'
import type { EffectiveSettings } from '@/lib/settings/schema'
import {
  applyOrderStatusToGuestlist,
  type OnlineOrderStatus,
} from '@/lib/guestlist/workflowMappings'

export interface PlaceOrderInput {
  location_id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  pickup_time: string
  items: Array<{ product_id: string; quantity: number }>
  notes: string | null
  order_type: 'pickup'
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
type OnlineSettings = EffectiveSettings['online']

export async function placeOrder(input: PlaceOrderInput) {
  const sb = await createSupabaseServerClient()
  await assertOnlineOrderingAllowed(sb, input.location_id)
  const settings = await getEffectiveSettings(input.location_id)
  validatePickupTime(input.pickup_time, settings.online)
  const products = await loadProducts(sb, input)
  const productMap = new Map(products.map((product) => [product.id, product]))
  await ensureInventoryAvailable(sb, input, productMap)
  const { orderLines, subtotal } = buildOrderLines(input, productMap)
  const estimatedTax = roundMoney(subtotal * 0.21)
  const estimatedTotal = roundMoney(subtotal + estimatedTax)

  if (settings.online.reserve_inventory) {
    await reserveOrderInventory(sb, input)
  }

  const order = await insertOrder(sb, input, subtotal, estimatedTax, estimatedTotal, orderLines)
  logger.info('Online order placed', { orderId: order.id, items: input.items.length })
  return order
}

async function assertOnlineOrderingAllowed(sb: SupabaseServerClient, locationId: string) {
  const { data: location, error } = await sb.from('locations')
    .select('allows_online_orders').eq('id', locationId).maybeSingle()
  if (error) throw new AppError('LOCATION_CHECK_FAILED', error.message, error, 500)
  if (!location) throw new AppError('LOCATION_NOT_FOUND', 'Location not found', undefined, 404)
  if (!location.allows_online_orders) {
    throw new AppError(
      'ONLINE_ORDERING_DISABLED',
      'This location is not accepting online orders',
      undefined,
      403,
    )
  }
}

function validatePickupTime(pickupTime: string, settings: OnlineSettings) {
  const pickupTimestamp = Date.parse(pickupTime)
  if (!Number.isFinite(pickupTimestamp)) {
    throw new AppError('INVALID_TIME', 'Pickup time is invalid', undefined, 400)
  }
  const now = Date.now()
  const earliestPickup = now + settings.pickup_window_minutes * 60_000
  if (pickupTimestamp < earliestPickup) {
    throw new AppError('INVALID_TIME', `Pickup time must be at least ${settings.pickup_window_minutes} minutes from now`, undefined, 400)
  }
  const latestPickup = now + settings.max_advance_order_days * 86_400_000
  if (pickupTimestamp > latestPickup) {
    throw new AppError('INVALID_TIME', `Pickup time cannot be more than ${settings.max_advance_order_days} days in advance`, undefined, 400)
  }
}

async function loadProducts(sb: SupabaseServerClient, input: PlaceOrderInput) {
  const productIds = input.items.map((i) => i.product_id)
  const { data: products } = await sb.from('products')
    .select('id, name, rec_price, is_active').in('id', productIds)
  if (!products || products.length !== productIds.length) {
    throw new AppError('PRODUCTS_NOT_FOUND', 'One or more products not found', undefined, 400)
  }
  return products
}

async function ensureInventoryAvailable(
  sb: SupabaseServerClient,
  input: PlaceOrderInput,
  productMap: Map<string, { name: string }>,
) {
  for (const item of input.items) {
    const { data: inv } = await sb
      .from('inventory_items')
      .select('id, quantity, quantity_reserved')
      .eq('product_id', item.product_id)
      .eq('location_id', input.location_id)
      .eq('is_active', true)
      .gt('quantity', 0)

    const available = (inv ?? []).reduce((s, i) => s + i.quantity - i.quantity_reserved, 0)
    if (available < item.quantity) {
      const prod = productMap.get(item.product_id)
      throw new AppError('INSUFFICIENT_INVENTORY', `Not enough ${prod?.name ?? 'product'} available (${available} in stock)`, undefined, 400)
    }
  }
}

function buildOrderLines(
  input: PlaceOrderInput,
  productMap: Map<string, { name: string; rec_price: number }>,
) {
  let subtotal = 0
  const orderLines = input.items.map((item) => {
    const prod = productMap.get(item.product_id)!
    const lineTotal = roundMoney(prod.rec_price * item.quantity)
    subtotal = roundMoney(subtotal + lineTotal)
    return { product_id: item.product_id, product_name: prod.name, quantity: item.quantity, unit_price: prod.rec_price }
  })
  return { orderLines, subtotal }
}

async function reserveOrderInventory(sb: SupabaseServerClient, input: PlaceOrderInput) {
  for (const item of input.items) {
    const { data: invItems } = await sb
      .from('inventory_items')
      .select('id, quantity, quantity_reserved')
      .eq('product_id', item.product_id)
      .eq('location_id', input.location_id)
      .eq('is_active', true)
      .gt('quantity', 0)
      .order('quantity', { ascending: false })

    let remaining = item.quantity
    for (const inv of invItems ?? []) {
      if (remaining <= 0) break
      const available = inv.quantity - inv.quantity_reserved
      if (available <= 0) continue
      const toReserve = Math.min(remaining, available)
      const { error } = await sb.from('inventory_items')
        .update({ quantity_reserved: inv.quantity_reserved + toReserve })
        .eq('id', inv.id)
      if (error) {
        logger.error('Reservation failed', { error: error.message, inventoryId: inv.id })
        throw new AppError('RESERVATION_FAILED', 'Failed to reserve inventory', error, 500)
      }
      remaining -= toReserve
    }
  }
}

async function insertOrder(
  sb: SupabaseServerClient,
  input: PlaceOrderInput,
  subtotal: number,
  estimatedTax: number,
  estimatedTotal: number,
  orderLines: Array<{ product_id: string; product_name: string; quantity: number; unit_price: number }>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error: orderErr } = await (sb.from('online_orders') as any).insert({
    location_id: input.location_id,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    customer_email: input.customer_email,
    order_type: input.order_type,
    status: 'pending',
    pickup_time: input.pickup_time,
    notes: input.notes,
    subtotal,
    estimated_tax: estimatedTax,
    estimated_total: estimatedTotal,
  }).select().single()

  if (orderErr) throw new AppError('ORDER_FAILED', orderErr.message, orderErr, 500)

  // Create order lines
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('online_order_lines') as any).insert(
    orderLines.map((l) => ({ order_id: order.id, ...l }))
  )
  return order
}

export async function getOrderStatus(orderId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('online_orders').select('*, online_order_lines ( * ), locations ( name, address_line1, city, state, zip, phone )').eq('id', orderId).single()
  return data
}

export async function cancelOrder(orderId: string) {
  const sb = await createSupabaseServerClient()
  const { data: order } = await sb.from('online_orders').select('id, status, location_id').eq('id', orderId).single()
  if (!order) throw new AppError('NOT_FOUND', 'Order not found', undefined, 404)
  if (order.status !== 'pending' && order.status !== 'confirmed') {
    throw new AppError('CANNOT_CANCEL', 'Order can only be cancelled when pending or confirmed', undefined, 400)
  }

  // Release reservations
  const { data: lines } = await sb.from('online_order_lines').select('product_id, quantity').eq('order_id', orderId)
  for (const line of lines ?? []) {
    await releaseReservation(sb, line.product_id, order.location_id, line.quantity)
  }

  const { error: cancelError } = await sb.from('online_orders')
    .update({ status: 'cancelled' }).eq('id', orderId)
  if (cancelError) throw new AppError('ORDER_UPDATE_FAILED', cancelError.message, cancelError, 500)
  await applyOrderStatusToGuestlist(orderId, order.location_id, 'cancelled', sb)
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OnlineOrderStatus,
  organizationId: string,
) {
  const sb = await createSupabaseServerClient()
  const { data: order, error: lookupError } = await sb.from('online_orders')
    .select('id, location_id, locations!inner(organization_id)')
    .eq('id', orderId)
    .eq('locations.organization_id', organizationId)
    .maybeSingle()
  if (lookupError) throw new AppError('ORDER_LOOKUP_FAILED', lookupError.message, lookupError, 500)
  if (!order) throw new AppError('NOT_FOUND', 'Order not found', undefined, 404)

  const { error: updateError } = await sb.from('online_orders')
    .update({ status: newStatus })
    .eq('id', orderId)
  if (updateError) throw new AppError('ORDER_UPDATE_FAILED', updateError.message, updateError, 500)

  await applyOrderStatusToGuestlist(orderId, order.location_id, newStatus, sb)
}

export async function convertToTransaction(orderId: string) {
  const sb = await createSupabaseServerClient()
  const { data: order } = await sb.from('online_orders')
    .select('*, online_order_lines ( *, products:product_id ( id, name, sku, rec_price, is_cannabis, weight_grams, category_id, brand_id ) )')
    .eq('id', orderId).single()

  if (!order) throw new AppError('NOT_FOUND', 'Order not found', undefined, 404)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cartItems = (order.online_order_lines ?? []).map((line: any) => ({
    productId: line.product_id,
    productName: line.product_name,
    quantity: line.quantity,
    unitPrice: line.unit_price,
    product: line.products,
  }))

  return { orderId: order.id, cartItems, customerName: order.customer_name, customerPhone: order.customer_phone }
}

export async function releaseExpiredReservations() {
  const sb = await createSupabaseServerClient()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data: expired } = await sb.from('online_orders')
    .select('id, location_id, online_order_lines ( product_id, quantity )')
    .eq('status', 'pending')
    .lt('created_at', twoHoursAgo)

  let count = 0
  for (const order of expired ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const line of (order as any).online_order_lines ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await releaseReservation(sb, line.product_id, (order as any).location_id, line.quantity)
    }
    const { error: cancelError } = await sb.from('online_orders')
      .update({ status: 'cancelled' }).eq('id', order.id)
    if (cancelError) throw new AppError('ORDER_UPDATE_FAILED', cancelError.message, cancelError, 500)
    await applyOrderStatusToGuestlist(order.id, order.location_id, 'cancelled', sb)
    count++
  }

  if (count > 0) logger.info('Expired orders released', { count })
  return count
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function releaseReservation(sb: any, productId: string, locationId: string, quantity: number) {
  const { data: invItems } = await sb.from('inventory_items').select('id, quantity_reserved')
    .eq('product_id', productId).eq('location_id', locationId).gt('quantity_reserved', 0)

  let remaining = quantity
  for (const inv of invItems ?? []) {
    if (remaining <= 0) break
    const toRelease = Math.min(remaining, inv.quantity_reserved)
    await sb.from('inventory_items').update({ quantity_reserved: Math.max(0, inv.quantity_reserved - toRelease) }).eq('id', inv.id)
    remaining -= toRelease
  }
}
