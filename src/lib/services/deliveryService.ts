import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export interface DeliveryAddress {
  street: string
  city: string
  state: string
  zip: string
  lat?: number
  lng?: number
}

export interface DeliveryEligibilityResult {
  eligible: boolean
  zone_id: string | null
  zone_name: string | null
  delivery_fee: number
  estimated_minutes: number
  minimum_order: number
  message: string
}

// Ray-casting point-in-polygon
function pointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]![1]!, yi = polygon[i]![0]!
    const xj = polygon[j]![1]!, yj = polygon[j]![0]!
    if ((yi > lng) !== (yj > lng) && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export async function checkDeliveryEligibility(address: DeliveryAddress, locationId: string): Promise<DeliveryEligibilityResult> {
  const sb = await createSupabaseServerClient()

  const { data: zones } = await (sb.from('delivery_zones') as any).select('*').eq('location_id', locationId).eq('is_active', true)

  if (!zones || zones.length === 0) {
    return { eligible: false, zone_id: null, zone_name: null, delivery_fee: 0, estimated_minutes: 0, minimum_order: 0, message: 'Delivery is not available at this location' }
  }

  // If coordinates provided, use point-in-polygon
  if (address.lat != null && address.lng != null) {
    // Sort by lowest fee (customer-friendly for overlapping zones)
    const sorted = [...zones].sort((a, b) => (a.delivery_fee ?? 0) - (b.delivery_fee ?? 0))

    for (const zone of sorted) {
      const boundary = zone.boundaries as { type: string; coordinates: number[][][] } | null
      if (!boundary?.coordinates?.[0]) continue

      if (pointInPolygon(address.lat, address.lng, boundary.coordinates[0])) {
        return {
          eligible: true,
          zone_id: zone.id,
          zone_name: zone.name,
          delivery_fee: zone.delivery_fee ?? 0,
          estimated_minutes: zone.estimated_delivery_minutes ?? 45,
          minimum_order: zone.min_order ?? 0,
          message: `Delivery available via ${zone.name}`,
        }
      }
    }
  }

  // Fallback: zip code matching (if no coordinates)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchByZip = zones.find((z: any) => {
    const boundary = z.boundaries as { zip_codes?: string[] } | null
    return boundary?.zip_codes?.includes(address.zip)
  })

  if (matchByZip) {
    return {
      eligible: true,
      zone_id: matchByZip.id,
      zone_name: matchByZip.name,
      delivery_fee: matchByZip.delivery_fee ?? 0,
      estimated_minutes: matchByZip.estimated_delivery_minutes ?? 45,
      minimum_order: matchByZip.min_order ?? 0,
      message: `Delivery available via ${matchByZip.name}`,
    }
  }

  // Check first zone as default if only one exists (simple setup)
  if (zones.length === 1) {
    const z = zones[0]!
    return {
      eligible: true,
      zone_id: z.id,
      zone_name: z.name,
      delivery_fee: z.delivery_fee ?? 0,
      estimated_minutes: z.estimated_delivery_minutes ?? 45,
      minimum_order: z.min_order ?? 0,
      message: `Delivery available via ${z.name}`,
    }
  }

  return { eligible: false, zone_id: null, zone_name: null, delivery_fee: 0, estimated_minutes: 0, minimum_order: 0, message: 'Address is outside our delivery area' }
}

export async function assignDriverToOrder(orderId: string, driverId: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb.from('online_orders') as any).update({ driver_id: driverId, status: 'out_for_delivery' }).eq('id', orderId)
  logger.info('Driver assigned to order', { orderId, driverId })
}

export async function listAvailableDrivers(orgId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await (sb.from('delivery_drivers') as any).select('*, employees ( first_name, last_name ), delivery_vehicles ( name, license_plate )').eq('organization_id', orgId).eq('is_active', true)
  return data ?? []
}

export async function getDeliveryConfig(orgId: string) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb.from('delivery_config') as any).select('*').eq('organization_id', orgId).eq('is_active', true).maybeSingle()
  return data
}

export async function listZones(locationId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await (sb.from('delivery_zones') as any).select('*').eq('location_id', locationId).eq('is_active', true).order('name')
  return data ?? []
}

export async function createZone(input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('delivery_zones') as any).insert(input).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateZone(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('delivery_zones') as any).update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}

export async function listVehicles(locationId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await (sb.from('delivery_vehicles') as any).select('*').eq('location_id', locationId).eq('is_active', true).order('name')
  return data ?? []
}

export async function createVehicle(input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('delivery_vehicles') as any).insert(input).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function listDrivers(orgId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await (sb.from('delivery_drivers') as any).select('*, employees ( first_name, last_name )').eq('organization_id', orgId).eq('is_active', true)
  return data ?? []
}

export async function createDriver(input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('delivery_drivers') as any).insert(input).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}
